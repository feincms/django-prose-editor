import { canInsertNode, Extension, mergeAttributes, Node } from "@tiptap/core"
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state"
import { crel, gettext, updateAttrsDialog } from "./utils.js"

const createId = () => Math.random().toString(36).slice(2, 10)

/** DOM id of the n-th reference (1-based) to a footnote */
export const referenceDomId = (id, index = 1) =>
  index > 1 ? `fnref-${id}-${index}` : `fnref-${id}`

const backrefLabel = (index, count) =>
  count === 1
    ? "↩"
    : `↩${index <= 26 ? String.fromCharCode(96 + index) : index}`

const findFootnote = (doc, id) => {
  let found = null
  doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name === "footnote" && node.attrs.id === id) {
      found = { node, pos }
    }
    return !found && node.type.name !== "footnote"
  })
  return found
}

const findReference = (doc, id, index = 1) => {
  let found = null
  let seen = 0
  doc.descendants((node, pos) => {
    if (found) return false
    if (
      node.type.name === "footnoteReference" &&
      node.attrs.id === id &&
      ++seen === index
    ) {
      found = { node, pos }
    }
    return !found
  })
  return found
}

const listFootnotes = (doc) => {
  const items = []
  doc.descendants((node, pos) => {
    if (node.type.name === "footnote") {
      items.push({ id: node.attrs.id, text: node.textContent, pos })
      return false
    }
    return true
  })
  return items
}

// Trailing empty paragraphs (e.g. from the TrailingNode extension) may follow
// the footnotes list without it being moved again.
const isIgnorableTrailingNode = (node) =>
  node.isTextblock && node.content.size === 0

const isAtEnd = (doc, pos) => {
  const $pos = doc.resolve(pos)
  if ($pos.depth !== 0) return false
  for (let i = $pos.index(0) + 1; i < doc.childCount; i++) {
    if (!isIgnorableTrailingNode(doc.child(i))) return false
  }
  return true
}

/**
 * Bring the footnotes list in sync with the references in the document:
 * - number footnotes by the first reference to them, in document order
 * - number repeated references (cross-references) to the same footnote
 * - one footnote per referenced ID, in order, at the end of the doc
 * - drop footnotes which aren't referenced anymore
 *
 * Mutates the transaction, returns true if anything changed.
 */
export const syncFootnotes = (tr) => {
  const schema = tr.doc.type.schema
  const refType = schema.nodes.footnoteReference
  const listType = schema.nodes.footnotes
  const itemType = schema.nodes.footnote
  if (!refType || !listType || !itemType) return false

  const lists = []
  const refs = []
  const contents = new Map()

  tr.doc.descendants((node, pos) => {
    if (node.type === listType) {
      lists.push({ node, pos })
      node.forEach((item) => {
        const { id } = item.attrs
        if (id && !contents.has(id)) contents.set(id, item.content)
      })
      return false
    }
    if (node.type === refType) refs.push({ node, pos })
    return true
  })

  let changed = false
  const order = []
  const numbers = new Map()
  const counts = new Map()

  for (const { node, pos } of refs) {
    const id = node.attrs.id || createId()
    if (!numbers.has(id)) {
      order.push(id)
      numbers.set(id, order.length)
    }
    const index = (counts.get(id) || 0) + 1
    counts.set(id, index)

    const label = String(numbers.get(id))
    if (
      id !== node.attrs.id ||
      label !== node.attrs.label ||
      index !== node.attrs.index
    ) {
      // Attribute changes on atom nodes don't change positions
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, id, label, index })
      changed = true
    }
  }

  if (lists.length === 0 && order.length === 0) return changed

  // Is the existing footnotes list already in the right place and order?
  if (lists.length === 1 && isAtEnd(tr.doc, lists[0].pos)) {
    const { node, pos } = lists[0]
    const ids = []
    node.forEach((item) => {
      ids.push(item.attrs.id)
    })
    if (ids.length === order.length && ids.every((id, i) => id === order[i])) {
      // Only update the number of back-references where necessary
      node.forEach((item, offset) => {
        const refsCount = counts.get(item.attrs.id)
        if (item.attrs.refs !== refsCount) {
          tr.setNodeMarkup(pos + 1 + offset, undefined, {
            ...item.attrs,
            refs: refsCount,
          })
          changed = true
        }
      })
      return changed
    }
  }

  // Rebuild the footnotes list
  for (const { node, pos } of lists.toReversed()) {
    tr.delete(pos, pos + node.nodeSize)
  }

  if (order.length) {
    tr.insert(
      tr.doc.content.size,
      listType.create(
        null,
        order.map((id) =>
          itemType.create(
            { id, refs: counts.get(id) },
            contents.get(id) || null,
          ),
        ),
      ),
    )
  }

  if (tr.doc.childCount === 0) {
    tr.insert(0, schema.nodes.paragraph.create())
  }

  return true
}

const crossReferenceDialog = (editor, footnotes) => {
  const labels = footnotes.map(({ text }, i) => {
    const excerpt = text.trim()
    return `${i + 1}: ${
      excerpt.length > 60
        ? `${excerpt.slice(0, 57)}…`
        : excerpt || gettext("(empty)")
    }`
  })

  return updateAttrsDialog(
    {
      footnote: {
        type: "string",
        title: gettext("Footnote"),
        enum: labels,
      },
    },
    {
      title: gettext("Insert cross-reference"),
      submitText: gettext("Insert"),
    },
  )(editor, { footnote: labels[0] }).then((attrs) =>
    attrs ? footnotes[labels.indexOf(attrs.footnote)] : null,
  )
}

export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) =>
          el.dataset.footnoteId ||
          el.id.replace(/^fnref-/, "").replace(/-\d+$/, "") ||
          null,
        renderHTML: () => ({}),
      },
      label: {
        default: "",
        parseHTML: (el) => el.textContent.trim(),
        renderHTML: () => ({}),
      },
      index: {
        default: 1,
        parseHTML: (el) => Number(el.id.match(/-(\d+)$/)?.[1] || 1),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    // Higher priority than the Superscript mark
    return [{ tag: "sup.footnote-ref", priority: 100 }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { id, label, index } = node.attrs
    return [
      "sup",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "footnote-ref",
        id: referenceDomId(id, index),
        "data-footnote-id": id,
      }),
      ["a", { href: `#fn-${id}` }, label || "?"],
    ]
  },

  renderText({ node }) {
    return `[${node.attrs.label}]`
  },
})

export const FootnoteList = Node.create({
  name: "footnotes",
  group: "block",
  content: "footnote+",
  isolating: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    // Higher priority than OrderedList
    return [{ tag: "ol.footnotes", priority: 100 }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["ol", mergeAttributes(HTMLAttributes, { class: "footnotes" }), 0]
  },
})

export const FootnoteItem = Node.create({
  name: "footnote",
  content: "text*",
  marks: "_",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) =>
          el.dataset.footnoteId || el.id.replace(/^fn-/, "") || null,
        renderHTML: () => ({}),
      },
      // Number of references, maintained by syncFootnotes
      refs: {
        default: 1,
        parseHTML: (el) => el.querySelectorAll(".footnote-backref").length || 1,
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "li[data-footnote-id]",
        priority: 100,
        contentElement: (dom) => dom.querySelector(".footnote-content") || dom,
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { id, refs } = node.attrs
    const backrefs = []
    for (let i = 1; i <= refs; i++) {
      backrefs.push(" ", [
        "a",
        { class: "footnote-backref", href: `#${referenceDomId(id, i)}` },
        backrefLabel(i, refs),
      ])
    }
    return [
      "li",
      mergeAttributes(HTMLAttributes, {
        id: `fn-${id}`,
        "data-footnote-id": id,
      }),
      ["span", { class: "footnote-content" }, 0],
      ...backrefs,
    ]
  },

  addNodeView() {
    return ({ node: initialNode, editor }) => {
      let node = initialNode
      const content = crel("span", { className: "footnote-content" })
      const backrefs = crel("span", {
        className: "footnote-backrefs",
        contentEditable: "false",
      })
      const dom = crel("li", { "data-footnote-id": node.attrs.id }, [
        content,
        backrefs,
      ])

      const renderBackrefs = () => {
        const { id, refs } = node.attrs
        backrefs.replaceChildren(
          ...Array.from({ length: refs }, (_, i) =>
            crel("a", {
              className: "footnote-backref",
              href: `#${referenceDomId(id, i + 1)}`,
              textContent: backrefLabel(i + 1, refs),
              title: gettext("Back to reference"),
              "data-index": i + 1,
            }),
          ),
        )
      }
      renderBackrefs()

      backrefs.addEventListener("click", (e) => {
        const backref = e.target.closest(".footnote-backref")
        if (!backref) return
        e.preventDefault()
        editor
          .chain()
          .focus()
          .goToFootnoteReference(node.attrs.id, Number(backref.dataset.index))
          .run()
      })

      return {
        dom,
        contentDOM: content,
        update(updatedNode) {
          if (updatedNode.type !== node.type) return false
          const rerender =
            updatedNode.attrs.id !== node.attrs.id ||
            updatedNode.attrs.refs !== node.attrs.refs
          node = updatedNode
          dom.dataset.footnoteId = node.attrs.id
          if (rerender) renderBackrefs()
          return true
        },
        stopEvent: (event) => backrefs.contains(event.target),
        ignoreMutation: (mutation) =>
          mutation.type !== "selection" && !content.contains(mutation.target),
      }
    }
  },
})

export const Footnote = Extension.create({
  name: "footnote",

  addExtensions() {
    return [FootnoteReference, FootnoteList, FootnoteItem]
  },

  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ tr, state, dispatch }) => {
          const refType = state.schema.nodes.footnoteReference
          if (!canInsertNode(state, refType)) return false
          if (dispatch) {
            const id = createId()
            tr.replaceSelectionWith(refType.create({ id }))
            syncFootnotes(tr)
            const item = findFootnote(tr.doc, id)
            if (item) {
              tr.setSelection(TextSelection.create(tr.doc, item.pos + 1))
            }
            tr.scrollIntoView()
          }
          return true
        },

      insertFootnoteCrossReference:
        (id) =>
        ({ tr, state, dispatch }) => {
          const refType = state.schema.nodes.footnoteReference
          if (!canInsertNode(state, refType)) return false
          if (!findFootnote(state.doc, id)) return false
          if (dispatch) {
            tr.replaceSelectionWith(refType.create({ id }))
            syncFootnotes(tr)
            tr.scrollIntoView()
          }
          return true
        },

      addFootnoteCrossReference:
        () =>
        ({ editor, state, dispatch }) => {
          const refType = state.schema.nodes.footnoteReference
          const footnotes = listFootnotes(state.doc)
          if (!footnotes.length || !canInsertNode(state, refType)) return false
          if (!dispatch) return true

          crossReferenceDialog(editor, footnotes).then((footnote) => {
            if (footnote) {
              editor
                .chain()
                .focus()
                .insertFootnoteCrossReference(footnote.id)
                .run()
            }
          })
          return true
        },

      goToFootnote:
        (id) =>
        ({ tr, dispatch }) => {
          const item = findFootnote(tr.doc, id)
          if (!item) return false
          if (dispatch) {
            const end = item.pos + 1 + item.node.content.size
            tr.setSelection(TextSelection.create(tr.doc, end)).scrollIntoView()
          }
          return true
        },

      goToFootnoteReference:
        (id, index = 1) =>
        ({ tr, dispatch }) => {
          const ref = findReference(tr.doc, id, index)
          if (!ref) return false
          if (dispatch) {
            tr.setSelection(
              NodeSelection.create(tr.doc, ref.pos),
            ).scrollIntoView()
          }
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Splitting a footnote would create two footnotes with the same ID
      Enter: ({ editor }) =>
        editor.state.selection.$from.parent.type.name === "footnote",
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey("footnotes"),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null
          const tr = newState.tr
          return syncFootnotes(tr) ? tr : null
        },
        props: {
          handleClickOn(_view, _pos, node, _nodePos, event, direct) {
            if (!direct || node.type.name !== "footnoteReference") return false
            event.preventDefault()
            return editor.commands.goToFootnote(node.attrs.id)
          },
          handleDOMEvents: {
            click(_view, event) {
              // Never follow footnote links inside the editor
              if (
                event.target.closest?.(".footnote-ref a, .footnote-backref")
              ) {
                event.preventDefault()
              }
              return false
            },
          },
        },
      }),
    ]
  },

  onCreate() {
    // Repair content which was saved in an inconsistent state
    const tr = this.editor.state.tr
    if (syncFootnotes(tr)) {
      tr.setMeta("addToHistory", false)
      this.editor.view.dispatch(tr)
    }
  },

  addMenuItems({ buttons, menu }) {
    menu.defineItem({
      name: "footnote",
      groups: "nodes footnote",
      command(editor) {
        editor.chain().focus().insertFootnote().run()
      },
      enabled(editor) {
        return editor.can().insertFootnote()
      },
      button: buttons.material("edit_note", gettext("footnote")),
    })

    menu.defineItem({
      name: "footnoteCrossReference",
      groups: "nodes footnote",
      priority: 99,
      command(editor) {
        editor.chain().focus().addFootnoteCrossReference().run()
      },
      enabled(editor) {
        return editor.can().addFootnoteCrossReference()
      },
      button: buttons.material("shortcut", gettext("footnote cross-reference")),
    })
  },
})
