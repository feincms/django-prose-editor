/**
 * StyleLoom Extension
 *
 * Adds configurable inline CSS properties to ProseMirror nodes and marks.
 * Opens a single dialog showing all properties relevant to the current context.
 *
 * Usage:
 *   StyleLoom.configure({
 *     title: "CSS Styles",   // optional, menu button label
 *     groups: "marks",       // optional, menu group(s)
 *     properties: {
 *       "font-size": {
 *         title: "Schriftgrösse",
 *         description: "Im CSS-Format (z.B. 1.5em, 20px).",
 *         types: ["textStyle"],
 *       },
 *       "max-width": {
 *         title: "Max. Breite",
 *         types: ["paragraph", "heading"],
 *       },
 *       "border-style": {
 *         title: "Rahmenstil",
 *         types: ["table"],
 *       },
 *     }
 *   })
 *
 * Each property key is a CSS property name (kebab-case). Per-property config:
 *   - title: Label shown in the dialog
 *   - description: (optional) Help text shown below the field
 *   - types: ProseMirror type names; use "textStyle" for inline text marks
 *
 * The menu button is hidden when no configured property applies to the current
 * cursor position. The dialog only shows properties relevant to the context.
 */

import { Extension } from "@tiptap/core"
import { updateAttrsDialog } from "./utils.js"

const toCamel = (str) => str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

export const StyleLoom = Extension.create({
  name: "styleLoom",

  addOptions() {
    return {
      properties: {},
      title: "Styles",
      groups: "marks",
    }
  },

  addGlobalAttributes() {
    const typeMap = new Map()

    for (const [cssProp, config] of Object.entries(this.options.properties)) {
      const attrKey = toCamel(cssProp)

      for (const type of config.types) {
        if (!typeMap.has(type)) typeMap.set(type, {})
        typeMap.get(type)[attrKey] = {
          default: null,
          parseHTML: (element) => element.style[attrKey] || null,
          renderHTML: (attributes) =>
            attributes[attrKey]
              ? { style: `${cssProp}: ${attributes[attrKey]}` }
              : {},
        }
      }
    }

    return [...typeMap.entries()].map(([type, attributes]) => ({
      types: [type],
      attributes,
    }))
  },

  addMenuItems({ buttons, menu }) {
    const allProperties = Object.entries(this.options.properties)
    const { title, groups } = this.options

    // All node type names with configured properties (excluding textStyle)
    const configuredNodeTypes = new Set(
      allProperties.flatMap(([, config]) =>
        config.types.filter((t) => t !== "textStyle"),
      ),
    )

    const relevantProps = (editor) => {
      const { selection } = editor.state
      const { $from } = selection

      // textStyle only applies to a non-empty text selection (not a node selection)
      const hasTextSelection = !selection.empty && !selection.node

      // Walk up from the cursor to find the deepest configured node type
      let activeNodeType = null
      for (let depth = $from.depth; depth > 0; depth--) {
        const name = $from.node(depth).type.name
        if (configuredNodeTypes.has(name)) {
          activeNodeType = name
          break
        }
      }

      return allProperties.filter(
        ([, config]) =>
          (hasTextSelection && config.types.includes("textStyle")) ||
          (activeNodeType && config.types.includes(activeNodeType)),
      )
    }

    menu.defineItem({
      name: "styleLoom",
      groups,
      button: buttons.text(title),
      hidden(editor) {
        return relevantProps(editor).length === 0
      },
      active(editor) {
        return relevantProps(editor).some(([cssProp, config]) => {
          const attrKey = toCamel(cssProp)
          return config.types.some((t) => {
            if (t === "textStyle")
              return !!editor.getAttributes("textStyle")[attrKey]
            return !!editor.getAttributes(t)[attrKey]
          })
        })
      },
      command(editor) {
        const props = relevantProps(editor)

        // Build dialog schema from the relevant properties
        const schema = Object.fromEntries(
          props.map(([cssProp, config]) => [
            toCamel(cssProp),
            {
              type: "string",
              title: config.title,
              description: config.description,
            },
          ]),
        )

        // Collect current values from the active context
        const initialValues = {}
        for (const [cssProp, config] of props) {
          const attrKey = toCamel(cssProp)
          if (config.types.includes("textStyle")) {
            initialValues[attrKey] = editor.getAttributes("textStyle")[attrKey]
          }
          if (!initialValues[attrKey]) {
            for (const nodeType of config.types.filter(
              (t) => t !== "textStyle",
            )) {
              initialValues[attrKey] = editor.getAttributes(nodeType)[attrKey]
              if (initialValues[attrKey]) break
            }
          }
        }

        updateAttrsDialog(schema, { title })(editor, initialValues).then(
          (attrs) => {
            if (!attrs) return

            let chain = editor.chain().focus()
            let hasTextStyleChanges = false

            for (const [cssProp, config] of props) {
              const attrKey = toCamel(cssProp)
              const value = attrs[attrKey] || null
              const nodeTypes = config.types.filter((t) => t !== "textStyle")
              const hasTextStyle = config.types.includes("textStyle")

              if (hasTextStyle) {
                chain = chain.setMark("textStyle", { [attrKey]: value })
                hasTextStyleChanges = true
              }

              for (const nodeType of nodeTypes) {
                chain = chain.updateAttributes(nodeType, { [attrKey]: value })
              }
            }

            // Clean up empty textStyle marks once after all attributes are set
            if (hasTextStyleChanges) {
              chain = chain.removeEmptyTextStyle()
            }

            chain.run()
          },
        )
      },
    })
  },
})
