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
  const { $from } = selection
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

  addCommands() {
    return {
      // Set the class for a specific node or mark type (replaces existing class)
      setNodeClass:
        (type, className) =>
        ({ commands, state }) => {
          const cssClasses = this.options.cssClasses
          if (!cssClasses[type]) {
            console.warn(`NodeClass: Type "${type}" not configured`)
            return false
          }

          const isNode = !!state.schema.nodes[type]

          if (isNode) {
            // Handle node
            const applicableNodes = getApplicableNodes(state, cssClasses)
            for (const { node, pos } of applicableNodes) {
              if (node.type.name === type) {
                return commands.command(({ tr }) => {
                  tr.setNodeAttribute(pos, "class", className)
                  return true
                })
              }
            }
            return false
          } else {
            // Handle mark: extend mark range and update attributes
            commands.extendMarkRange(type)
            return commands.updateAttributes(type, { class: className })
          }
        },

      // Clear classes from a specific type, or all types if no type given
      unsetNodeClass:
        (type) =>
        ({ commands, state }) => {
          const cssClasses = this.options.cssClasses

          if (!type) {
            // Clear all classes from all types - execute each clear operation
            const applicableNodes = getApplicableNodes(state, cssClasses)
            const applicableMarks = getApplicableMarks(state, cssClasses)

            // Collect all unique types to clear
            const typesToClear = new Set()
            applicableNodes.forEach(({ nodeType }) => {
              typesToClear.add(nodeType)
            })
            applicableMarks.forEach(({ markType }) => {
              typesToClear.add(markType.name)
            })

            // Clear each type using this same command recursively
            let success = true
            typesToClear.forEach((typeName) => {
              success = success && commands.unsetNodeClass(typeName)
            })

            return success
          }

          // Clear classes from specific type
          if (!cssClasses[type]) {
            console.warn(`NodeClass: Type "${type}" not configured`)
            return false
          }

          const isNode = !!state.schema.nodes[type]

          if (isNode) {
            // Handle node
            const applicableNodes = getApplicableNodes(state, cssClasses)
            for (const { node, pos } of applicableNodes) {
              if (node.type.name === type) {
                return commands.command(({ tr }) => {
                  tr.setNodeAttribute(pos, "class", null)
                  return true
                })
              }
            }
            return false
          } else {
            // Handle mark
            commands.extendMarkRange(type)
            return commands.updateAttributes(type, { class: null })
          }
        },
    }
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

    // Add a global "Reset all classes" option
    menu.defineItem({
      name: `${this.name}:global:reset`,
      groups: this.name,
      button: buttons.text("Block style"),
      option: crel("p", {
        textContent: "Reset all classes",
      }),
      active(_editor) {
        // Always active so this is always shown as the dropdown button
        return true
      },
      command(editor) {
        editor.chain().focus().unsetNodeClass().run()
      },
    })

    // Create menu items for each type and its classes
    for (const typeName of Object.keys(cssClasses)) {
      const classes = getTypeClasses(cssClasses[typeName])
      if (!classes || classes.length === 0) continue

      const typeTitle = getTypeTitle(cssClasses[typeName], typeName)

      // Add a "Clear [Type]" button for this specific type
      menu.defineItem({
        name: `${this.name}:${typeName}:clear`,
        groups: this.name,
        button: buttons.text(`${typeTitle}: default`),
        option: crel("p", {
          textContent: `${typeTitle}: default`,
        }),
        active(editor) {
          // Show as active (dropdown button) when type is applicable
          if (isNodeType(editor, typeName)) {
            const applicableNodes = getApplicableNodes(editor.state, cssClasses)
            return applicableNodes.some((n) => n.nodeType === typeName)
          } else {
            // For marks: check if mark type exists at current position
            const { state } = editor
            const { $from } = state.selection
            const markType = state.schema.marks[typeName]
            if (!markType) return false
            const marks = $from.marks()
            return marks.some((mark) => mark.type === markType)
          }
        },
        hidden(editor) {
          // Hide when type is not applicable
          if (isNodeType(editor, typeName)) {
            const applicableNodes = getApplicableNodes(editor.state, cssClasses)
            return !applicableNodes.some((n) => n.nodeType === typeName)
          } else {
            // For marks: check if mark type exists at current position
            const { state } = editor
            const { $from } = state.selection
            const markType = state.schema.marks[typeName]
            if (!markType) return true
            const marks = $from.marks()
            const hasMark = marks.some((mark) => mark.type === markType)
            return !hasMark
          }
        },
        command(editor) {
          if (isNodeType(editor, typeName)) {
            // Handle node
            const applicableNodes = getApplicableNodes(editor.state, cssClasses)
            for (const { node, pos } of applicableNodes) {
              if (node.type.name === typeName) {
                editor
                  .chain()
                  .focus()
                  .command(({ tr }) => {
                    tr.setNodeAttribute(pos, "class", null)
                    return true
                  })
                  .run()
                return
              }
            }
          } else {
            // Handle mark
            editor
              .chain()
              .focus()
              .extendMarkRange(typeName)
              .updateAttributes(typeName, { class: null })
              .run()
          }
        },
      })

      // Add class options for this type
      for (const cls of classes) {
        const { className, title } = cssClass(cls)

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
              const { $from } = state.selection
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
