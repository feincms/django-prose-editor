// Plugin which shows special characters (non-breaking spaces and soft hyphens)

import { Extension } from "@tiptap/core"

import { Plugin } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const SpecialCharacters = Extension.create({
  name: "specialCharacters",

  addProseMirrorPlugins() {
    return [specialCharactersPlugin]
  },
})

// Deprecated alias, the extension has been renamed to avoid confusion with
// Tiptap's Typography extension.
export const Typographic = SpecialCharacters

// https://discuss.prosemirror.net/t/efficiently-finding-changed-nodes/4280/5
// Helper for iterating through the nodes in a document that changed
// compared to the given previous document. Useful for avoiding
// duplicate work on each transaction.
function changedDescendants(old, cur, offset, f) {
  const oldSize = old.childCount
  const curSize = cur.childCount
  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = cur.child(i)
    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (old.child(scan) === child) {
        j = scan + 1
        offset += child.nodeSize
        continue outer
      }
    }
    f(child, offset)
    if (j < oldSize && old.child(j).sameMarkup(child))
      changedDescendants(old.child(j), child, offset + 1, f)
    else child.nodesBetween(0, child.content.size, f, offset + 1)
    offset += child.nodeSize
  }
}

const classes = {
  "\u00A0": "prose-editor-nbsp",
  "\u00AD": "prose-editor-shy",
}

const specialCharactersDecorationsForNode = (node, position) => {
  const decorations = []
  if (node.text) {
    for (const match of node.text.matchAll(/(\u00A0|\u00AD)/g)) {
      const from = position + (match.index || 0)
      decorations.push(
        Decoration.inline(from, from + 1, {
          class: classes[match[1]],
        }),
      )
    }
  }
  return decorations
}

const specialCharactersDecorations = (doc) => {
  const decorations = []
  doc.descendants((node, position) => {
    decorations.push(specialCharactersDecorationsForNode(node, position))
  })
  return DecorationSet.create(doc, decorations.flat())
}

const specialCharactersPlugin = new Plugin({
  state: {
    init(_, { doc }) {
      return specialCharactersDecorations(doc)
    },
    apply(tr, set, oldState) {
      // I fear that's not very performant. Maybe improve this "later".
      // return tr.docChanged ? specialCharactersDecorations(tr.doc) : set

      let newSet = set.map(tr.mapping, tr.doc)
      changedDescendants(oldState.doc, tr.doc, 0, (node, offset) => {
        // First, remove our inline decorations for the current node
        newSet = newSet.remove(newSet.find(offset, offset + node.content.size))
        // Then, add decorations (including the new content)
        newSet = newSet.add(
          tr.doc,
          specialCharactersDecorationsForNode(node, offset),
        )
      })

      return newSet
    },
  },
  props: {
    decorations(state) {
      return specialCharactersPlugin.getState(state)
    },
  },
})
