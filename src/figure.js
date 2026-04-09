import { canInsertNode, mergeAttributes, Node } from "@tiptap/core"
import { gettext, updateAttrsDialog } from "./utils.js"

const getFigureInfo = ({ selection }) => {
  const { $from } = selection

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name !== "figure") continue

    let imageNode = null
    let imagePos = null
    const pos = $from.start(depth)

    let hasCaption = false
    node.forEach((child, offset) => {
      if (child.type.name === "image") {
        imageNode = child
        imagePos = pos + offset
      } else if (child.type.name === "caption") {
        hasCaption = true
      }
    })

    return { imageNode, imagePos, hasCaption }
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
      insertFigure:
        () =>
        ({ editor, state, dispatch }) => {
          const figureInfo = getFigureInfo(state)
          const nodeType = state.schema.nodes[this.name]
          const canInsert = figureInfo || canInsertNode(state, nodeType)

          if (!dispatch) return canInsert
          if (!canInsert) return false

          let imageUrl = ""
          let altText = ""

          if (figureInfo?.imageNode) {
            imageUrl = figureInfo.imageNode.attrs.src || ""
            altText = figureInfo.imageNode.attrs.alt || ""
          }

          const properties = {
            imageUrl: {
              type: "string",
              title: gettext("Image URL"),
              format: "url",
              required: true,
              pickerUrl: this.options.pickerUrl,
            },
            altText: {
              type: "string",
              title: gettext("Alternative Text"),
            },
          }

          updateAttrsDialog(properties, {
            title: figureInfo
              ? gettext("Edit Figure")
              : gettext("Insert Figure"),
            submitText: figureInfo ? gettext("Update") : gettext("Insert"),
          })(editor, { imageUrl, altText }).then((attrs) => {
            if (!attrs) return

            const src = attrs.imageUrl.trim()
            const alt = attrs.altText.trim()

            if (!src) return

            if (figureInfo) {
              const { imagePos, hasCaption } = figureInfo
              if (imagePos !== null) {
                let chain = editor
                  .chain()
                  .setNodeSelection(imagePos)
                  .updateAttributes("image", { src, alt })
                if (!hasCaption) {
                  chain = chain.insertContentAt(imagePos + 1, {
                    type: "caption",
                  })
                }
                chain.run()
              }
            } else {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "figure",
                  content: [
                    { type: "image", attrs: { src, alt } },
                    { type: "caption" },
                  ],
                })
                .run()
            }
          })

          return true
        },
    }
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
