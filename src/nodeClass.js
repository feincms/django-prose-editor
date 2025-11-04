import { Extension } from "@tiptap/core"
import { crel } from "./utils.js"

const cssClass = (c) => (typeof c === "string" ? { className: c, title: c } : c)

const getApplicableNodes = (state, cssClasses) => {
  const { selection } = state
  const { $from } = selection
  const applicableNodes = []

  let depth = $from.depth
  while (depth > 0) {
    const node = $from.node(depth)
    if (cssClasses[node.type.name]) {
      applicableNodes.push({
        nodeType: node.type.name,
        node: node,
        depth: depth,
        pos: $from.before(depth),
      })
    }
    depth--
  }

  return applicableNodes
}

const getApplicableMarks = (state, cssClasses) => {
  const { selection } = state
  const { $from, $to } = selection
  const applicableMarks = []

  // Get marks at the current selection
  const marks = $from.marks()

  for (const mark of marks) {
    if (cssClasses[mark.type.name]) {
      applicableMarks.push({
        markType: mark.type.name,
        mark: mark,
      })
    }
  }

  return applicableMarks
}

// NodeClass extension: Applies CSS classes to both nodes and marks
// Note: Despite the name, this extension supports both nodes (paragraphs, tables, etc.)
// and marks (bold, italic, links, etc.). The name is kept for backward compatibility.
export const NodeClass = Extension.create({
  name: "nodeClass",

  addOptions() {
    return {
      cssClasses: {},
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: Object.keys(this.options.cssClasses),
        attributes: {
          class: {
            default: null,
            parseHTML: (element) => {
              const className = element.className?.trim()
              if (!className) return null

              return className
            },
            renderHTML: (attributes) => {
              if (!attributes.class) {
                return {}
              }

              return {
                class: attributes.class,
              }
            },
          },
        },
      },
    ]
  },

  addMenuItems({ buttons, menu }) {
    const cssClasses = this.options.cssClasses

    // Helper function to get the display title
    const getTypeTitle = (typeConfig, typeName) => {
      if (
        typeof typeConfig === "object" &&
        typeConfig.title &&
        !Array.isArray(typeConfig)
      ) {
        return typeConfig.title
      }
      return typeName
    }

    // Helper function to get the classes
    const getTypeClasses = (typeConfig) => {
      if (
        typeof typeConfig === "object" &&
        typeConfig.cssClasses &&
        !Array.isArray(typeConfig)
      ) {
        return typeConfig.cssClasses
      }
      return Array.isArray(typeConfig) ? typeConfig : []
    }

    // Helper function to check if a type is a node or mark
    const isNodeType = (editor, typeName) => {
      return !!editor.state.schema.nodes[typeName]
    }

    // Add a global "Reset classes" option that clears all node and mark classes
    menu.defineItem({
      name: `${this.name}:global:reset`,
      groups: this.name,
      button: buttons.text("Block style"),
      option: crel("p", {
        textContent: "Reset classes",
      }),
      active(_editor) {
        // Always active so this is always shown as the dropdown button
        return true
      },
      hidden(_editor) {
        // Never hidden so always available
        return false
      },
      command(editor) {
        // Remove classes from all applicable ancestor nodes and marks
        const applicableNodes = getApplicableNodes(editor.state, cssClasses)
        const applicableMarks = getApplicableMarks(editor.state, cssClasses)

        let chain = editor.chain().focus()

        // Reset node classes
        chain = chain.command(({ tr }) => {
          for (const { pos } of applicableNodes) {
            tr.setNodeAttribute(pos, "class", null)
            return true
          }
        })

        // Reset mark classes by extending range and removing class attribute
        for (const { markType } of applicableMarks) {
          chain = chain
            .extendMarkRange(markType)
            .updateAttributes(markType, { class: null })
        }

        chain.run()
      },
    })

    // Create menu items for each type and its classes
    for (const typeName of Object.keys(cssClasses)) {
      const classes = getTypeClasses(cssClasses[typeName])
      if (!classes || classes.length === 0) continue

      // Add class options for this type
      for (const cls of classes) {
        const { className, title } = cssClass(cls)
        const typeTitle = getTypeTitle(cssClasses[typeName], typeName)

        menu.defineItem({
          name: `${this.name}:${typeName}:${className}`,
          groups: this.name,
          button: buttons.text(`${typeTitle}: ${title}`),
          option: crel("p", {
            className: className,
            textContent: `${typeTitle}: ${title}`,
          }),
          active(editor) {
            if (isNodeType(editor, typeName)) {
              // Active when this specific node type has this class
              const applicableNodes = getApplicableNodes(
                editor.state,
                cssClasses,
              )
              const targetNode = applicableNodes.find(
                (n) => n.nodeType === typeName,
              )
              return targetNode && targetNode.node.attrs.class === className
            } else {
              // Active when this specific mark type has this class
              return editor.isActive(typeName, { class: className })
            }
          },
          hidden(editor) {
            if (isNodeType(editor, typeName)) {
              const applicableNodes = getApplicableNodes(
                editor.state,
                cssClasses,
              )
              return !applicableNodes.some((n) => n.nodeType === typeName)
            } else {
              // For marks: check if mark type exists at current position
              const { state } = editor
              const { from, $from } = state.selection
              const markType = state.schema.marks[typeName]

              if (!markType) return true

              // Check marks at the resolved position
              const marks = $from.marks()
              const hasMark = marks.some((mark) => mark.type === markType)

              return !hasMark
            }
          },
          command(editor) {
            if (isNodeType(editor, typeName)) {
              // Handle node
              const applicableNodes = getApplicableNodes(
                editor.state,
                cssClasses,
              )
              for (const { node, pos } of applicableNodes) {
                if (node.type.name === typeName) {
                  editor
                    .chain()
                    .focus()
                    .command(({ tr }) => {
                      tr.setNodeAttribute(pos, "class", className)
                      return true
                    })
                    .run()
                  return
                }
              }
            } else {
              // Handle mark: extend mark range and update attributes
              editor
                .chain()
                .focus()
                .extendMarkRange(typeName)
                .updateAttributes(typeName, { class: className })
                .run()
            }
          },
        })
      }
    }
  },
})
