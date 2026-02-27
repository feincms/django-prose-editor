import { canInsertNode, mergeAttributes, Node } from "@tiptap/core"
import { gettext, updateAttrsDialog } from "./utils.js"

const getNodesFromState = ({ selection }) => {
  const { $from } = selection

  // Try to find the figure node in the ancestors
  let figureNode = null
  let captionNode = null
  let imageNode = null

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth)
    if (node.type.name === "figure") {
      figureNode = node

      // Find the child nodes (image and caption)
      node.forEach((child, _, _i) => {
        if (child.type.name === "image") {
          imageNode = child
        } else if (child.type.name === "caption") {
          captionNode = child
        }
      })

      break
    }
  }

  return { figureNode, captionNode, imageNode }
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
          const isEditingFigure = editor.isActive("figure")
          const nodeType = state.schema.nodes[this.name]

          const canInsert = isEditingFigure || canInsertNode(state, nodeType)

          if (!dispatch) {
            return canInsert
          }

          if (!canInsert) {
            return false
          }

          // Get current figure data if we're editing
          let currentImageSrc = ""
          let currentImageAlt = ""
          let currentCaption = ""

          if (isEditingFigure) {
            // Get the selected figure node
            const { state } = editor
            const { figureNode, captionNode, imageNode } =
              getNodesFromState(state)

            if (figureNode && imageNode) {
              currentImageSrc = imageNode.attrs.src || ""
              currentImageAlt = imageNode.attrs.alt || ""

              if (captionNode) {
                // Extract caption text
                const textContent = []
                captionNode.descendants((node) => {
                  if (node.isText) {
                    textContent.push(node.text)
                  }
                  return true
                })
                currentCaption = textContent.join("")
              }
            }
          }

          // Define dialog properties
          const figureDialogProperties = {
            imageUrl: {
              type: "string",
              title: gettext("Image URL"),
              format: "url",
              required: true,
            },
            altText: {
              type: "string",
              title: gettext("Alternative Text"),
            },
            caption: {
              type: "string",
              title: gettext("Caption"),
            },
          }

          // Define dialog options
          const dialogOptions = {
            title: isEditingFigure
              ? gettext("Edit Figure")
              : gettext("Insert Figure"),
            submitText: isEditingFigure ? gettext("Update") : gettext("Insert"),
          }

          // Create initial attrs based on current values
          const initialAttrs = {
            imageUrl: currentImageSrc,
            altText: currentImageAlt,
            caption: currentCaption,
          }

          // Use the updateAttrsDialog helper
          const dialogFn = updateAttrsDialog(
            figureDialogProperties,
            dialogOptions,
          )

          dialogFn(editor, initialAttrs).then((attrs) => {
            if (!attrs) return true // Cancelled but command is considered successful

            const imageUrl = attrs.imageUrl.trim()
            const imageAlt = attrs.altText.trim()
            const captionText = attrs.caption.trim()

            if (imageUrl) {
              if (isEditingFigure) {
                // Then update the image source - find the image node within the figure
                const { selection } = state
                const { $from } = selection

                for (let depth = $from.depth; depth > 0; depth--) {
                  const node = $from.node(depth)
                  if (node.type.name === "figure") {
                    // Find positions of image and caption
                    let imagePos = null
                    let captionPos = null
                    const pos = $from.start(depth)

                    node.forEach((child, offset) => {
                      if (child.type.name === "image") {
                        imagePos = pos + offset
                      } else if (child.type.name === "caption") {
                        captionPos = pos + offset
                      }
                    })

                    let chain = editor.chain()

                    // Update image source
                    if (imagePos !== null) {
                      chain = chain
                        .setNodeSelection(imagePos)
                        .updateAttributes("image", {
                          src: imageUrl,
                          alt: imageAlt,
                        })
                    }

                    if (captionText) {
                      const content = {
                        type: "caption",
                        content: [{ type: "text", text: captionText }],
                      }
                      if (captionPos) {
                        chain = chain
                          .setNodeSelection(captionPos)
                          .insertContent(content)
                      } else {
                        chain = chain.insertContentAt(imagePos + 1, content)
                      }
                    } else if (captionPos) {
                      chain = chain
                        .setNodeSelection(captionPos)
                        .deleteSelection()
                    }

                    chain.run()

                    break
                  }
                }
              } else {
                // Insert a new figure
                const content = [
                  {
                    type: "image",
                    attrs: { src: imageUrl, alt: imageAlt },
                  },
                ]
                if (captionText) {
                  content.push({
                    type: "caption",
                    content: [
                      {
                        type: "text",
                        text: captionText,
                      },
                    ],
                  })
                }

                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "figure",
                    content,
                  })
                  .run()
              }
            }
            return true
          })

          // Return true as the dialog is async, and we've already checked permissions
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
