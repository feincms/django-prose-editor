import { canInsertNode, mergeAttributes, Node } from "@tiptap/core"
import { BubbleMenu } from "@tiptap/extension-bubble-menu"
import { TextSelection } from "@tiptap/pm/state"
import { crel, gettext, updateAttrsDialog } from "./utils.js"

let _ckFuncNum = 0
const _ckCallbacks = new Map()
let _ckShimInstalled = false

const installCKShim = () => {
  if (_ckShimInstalled) return
  _ckShimInstalled = true
  window.CKEDITOR = window.CKEDITOR || {}
  window.CKEDITOR.tools = window.CKEDITOR.tools || {}
  const original = window.CKEDITOR.tools.callFunction
  window.CKEDITOR.tools.callFunction = (n, url, ...rest) => {
    original?.call(window.CKEDITOR.tools, n, url, ...rest)
    const cb = _ckCallbacks.get(+n)
    if (cb) {
      cb(url)
      _ckCallbacks.delete(+n)
    }
  }
}

const openFilePicker = (pickerUrl) => {
  installCKShim()
  return new Promise((resolve) => {
    const n = --_ckFuncNum
    _ckCallbacks.set(n, resolve)
    const sep = pickerUrl.includes("?") ? "&" : "?"
    window.open(
      `${pickerUrl}${sep}CKEditorFuncNum=${n}`,
      "_blank",
      "width=800,height=600",
    )
  })
}

const getSelectionInfo = ({ selection }) => {
  const { $from } = selection

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name !== "figure") continue

    let imageNode = null
    let imagePos = null
    const figureStart = $from.before(depth)
    const pos = $from.start(depth)

    let captionNode = null
    let captionPos = null
    node.forEach((child, offset) => {
      if (child.type.name === "image") {
        imageNode = child
        imagePos = pos + offset
      } else if (child.type.name === "caption") {
        captionNode = child
        captionPos = pos + offset
      }
    })

    return {
      inFigure: true,
      figureStart,
      figureNode: node,
      imageNode,
      imagePos,
      captionNode,
      captionPos,
    }
  }

  // Bare image (NodeSelection)
  const node = selection.node
  if (node?.type.name === "image") {
    return { inFigure: false, imageNode: node, imagePos: selection.from }
  }

  return null
}

/**
 * Extension for adding figures with images and captions
 */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "image caption?",
  draggable: true,
  isolating: true,

  addOptions() {
    return {
      pickerUrl: null,
    }
  },

  addAttributes() {
    return {
      class: {
        default: "figure",
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("figure")

      // Apply attributes to the figure element
      Object.entries(node.attrs).forEach(([attr, value]) => {
        if (attr === "class") {
          dom.className = value
        } else {
          dom.setAttribute(attr, value)
        }
      })

      return {
        dom,
        contentDOM: dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "figure") {
            return false
          }
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      editImage:
        () =>
        ({ editor, state, dispatch }) => {
          const info = getSelectionInfo(state)
          const nodeType = state.schema.nodes[this.name]
          const canInsert = info || canInsertNode(state, nodeType)

          if (!dispatch) return canInsert
          if (!canInsert) return false

          let imageUrl = ""
          let altText = ""

          if (info?.imageNode) {
            imageUrl = info.imageNode.attrs.src || ""
            altText = info.imageNode.attrs.alt || ""
          }

          const properties = {
            imageUrl: {
              type: "string",
              title: gettext("Image URL"),
              format: "url",
              required: true,
              picker: this.options.pickerUrl
                ? {
                    label: gettext("Browse..."),
                    fn: () => openFilePicker(this.options.pickerUrl),
                  }
                : null,
            },
            altText: {
              type: "string",
              title: gettext("Alternative Text"),
            },
          }

          const title = info?.inFigure
            ? gettext("Edit Figure")
            : info
              ? gettext("Edit Image")
              : gettext("Insert Figure")

          updateAttrsDialog(properties, {
            title,
            submitText: info ? gettext("Update") : gettext("Insert"),
          })(editor, { imageUrl, altText }).then((attrs) => {
            if (!attrs) return

            const src = attrs.imageUrl.trim()
            const alt = attrs.altText.trim()

            if (!src) return

            if (info) {
              editor
                .chain()
                .setNodeSelection(info.imagePos)
                .updateAttributes("image", { src, alt })
                .run()
            } else {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "figure",
                  content: [{ type: "image", attrs: { src, alt } }],
                })
                .run()
            }
          })

          return true
        },

      // Compatibility alias
      insertFigure:
        () =>
        ({ commands }) =>
          commands.editImage(),

      toggleCaption:
        () =>
        ({ state, dispatch }) => {
          const info = getSelectionInfo(state)
          if (!info) return false

          if (dispatch) {
            const { imageNode, imagePos } = info

            if (info.inFigure && info.captionNode) {
              // Remove caption and unwrap figure back to a bare image
              const { figureStart, figureNode } = info
              dispatch(
                state.tr.replaceWith(
                  figureStart,
                  figureStart + figureNode.nodeSize,
                  imageNode,
                ),
              )
            } else if (info.inFigure) {
              // Already in a figure — add the caption and focus it
              const captionType = state.schema.nodes.caption
              const insertPos = imagePos + imageNode.nodeSize
              const tr = state.tr.insert(insertPos, captionType.create())
              dispatch(
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(insertPos + 1)),
                ),
              )
            } else {
              // Bare image — wrap in figure, add caption, and focus it
              const figureType = state.schema.nodes.figure
              const captionType = state.schema.nodes.caption
              const tr = state.tr.replaceWith(
                imagePos,
                imagePos + imageNode.nodeSize,
                figureType.create({}, [imageNode, captionType.create()]),
              )
              // figure opening(1) + image(imageNode.nodeSize) + caption opening(1)
              const captionContentPos = imagePos + 1 + imageNode.nodeSize + 1
              dispatch(
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(captionContentPos)),
                ),
              )
            }
          }
          return true
        },
    }
  },

  addExtensions() {
    let editorRef = null

    const button = crel("button", {
      type: "button",
      className: "prose-menubar__button",
    })
    button.addEventListener("click", () => {
      editorRef?.chain().focus().toggleCaption().run()
    })

    const menu = crel(
      "div",
      { className: "prose-menubar prose-menubar--floating" },
      [button],
    )

    return [
      BubbleMenu.configure({
        element: menu,
        pluginKey: "figureMenu",
        shouldShow: ({ editor, state }) => {
          editorRef = editor
          const info = getSelectionInfo(state)
          if (!info) return false

          button.textContent =
            info.inFigure && info.captionNode
              ? gettext("Remove caption")
              : gettext("Add caption")

          return true
        },
      }),
    ]
  },
})

/**
 * Caption extension specifically for use within figures
 */
export const Caption = Node.create({
  name: "caption",
  content: "inline*",
  group: "block",
  isolating: true,

  addAttributes() {
    return {
      class: {
        default: "figure-caption",
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figcaption",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["figcaption", mergeAttributes(HTMLAttributes), 0]
  },
})
