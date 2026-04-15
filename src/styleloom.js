/**
 * StyleLoom Extension
 *
 * Adds configurable inline CSS properties to ProseMirror nodes and marks.
 * One menu button is created per context; each opens a dialog for that context.
 *
 * Usage:
 *
 *   StyleLoom.configure({
 *     contexts: {
 *       // A context with no `types` matches all types not explicitly claimed by
 *       // other contexts (deepest wins). Useful as a catch-all:
 *       styles: { title: "Styles", groups: "marks" },
 *
 *       // A context with explicit `types` targets only those node types.
 *       // Each button independently walks up the ancestor tree, so "table"
 *       // works even when the cursor is inside a cell:
 *       table:     { title: "Tabellen-Styles", groups: "table", types: ["table"] },
 *       tableCell: { title: "Zellen-Styles",   groups: "table", types: ["tableCell"] },
 *
 *       // Multiple types under one button — deepest match wins:
 *       block: { title: "Block-Styles", groups: "blocks",
 *                types: ["paragraph", "heading"] },
 *     },
 *     properties: {
 *       "font-size":        { title: "Schriftgrösse", types: ["textStyle"] },
 *       "width":            { title: "Breite",         types: ["table"] },
 *       "background-color": { title: "Hintergrund",    types: ["tableCell"] },
 *       "max-width":        { title: "Max. Breite",    types: ["paragraph", "heading"] },
 *     }
 *   })
 *
 * Per-property config:
 *   - title: Label shown in the dialog
 *   - description: (optional) Help text
 *   - types: ProseMirror type names; use "textStyle" for inline text marks
 *   - any other keys (enum, default, …) are forwarded to the dialog schema
 *
 * Menu items are named "styleLoom:<key>". Each is hidden when nothing in its
 * context applies at the current cursor position.
 */

import { Extension } from "@tiptap/core"
import { updateAttrsDialog } from "./utils.js"

export const StyleLoom = Extension.create({
  name: "styleLoom",

  addOptions() {
    return {
      contexts: { styles: { title: "Styles", groups: "marks" } },
      properties: {},
    }
  },

  addGlobalAttributes() {
    const typeMap = new Map()

    for (const [cssProp, config] of Object.entries(this.options.properties)) {
      for (const type of config.types) {
        if (!typeMap.has(type)) typeMap.set(type, {})
        typeMap.get(type)[cssProp] = {
          default: null,
          parseHTML: (element) =>
            element.style.getPropertyValue(cssProp) || null,
          renderHTML: (attributes) =>
            attributes[cssProp]
              ? { style: `${cssProp}: ${attributes[cssProp]}` }
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
    const { contexts } = this.options

    // Types explicitly claimed by contexts that have an explicit `types` array.
    const claimedTypes = new Set(
      Object.values(contexts).flatMap((c) => c.types ?? []),
    )

    // All configured types not claimed by any explicit context — used as the
    // fallback for contexts without `types`.
    const unclaimedTypes = [
      ...new Set(allProperties.flatMap(([, c]) => c.types)),
    ].filter((t) => !claimedTypes.has(t))

    // Build a resolveContext function for a set of target types.
    // Finds the deepest ancestor matching any of the node types in the set,
    // then filters properties to those applicable to the found node type.
    // "textStyle" in the set is handled separately via text selection.
    const makeResolveContext = (targetTypes) => (editor) => {
      const { selection } = editor.state
      const nodeTypes = targetTypes.filter((t) => t !== "textStyle")
      const includesTextStyle = targetTypes.includes("textStyle")
      const hasTextSelection = !selection.empty && !selection.node

      let ancestor = null
      if (nodeTypes.length) {
        if (selection.node && nodeTypes.includes(selection.node.type.name)) {
          ancestor = {
            nodeType: selection.node.type.name,
            pos: selection.from,
            node: selection.node,
          }
        } else {
          const { $from } = selection
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (nodeTypes.includes(node.type.name)) {
              ancestor = {
                nodeType: node.type.name,
                pos: $from.before(depth),
                node,
              }
              break
            }
          }
        }
      }

      const props = allProperties.filter(
        ([, c]) =>
          (includesTextStyle &&
            hasTextSelection &&
            c.types.includes("textStyle")) ||
          (ancestor && c.types.includes(ancestor.nodeType)),
      )
      if (!props.length) return null
      return {
        ancestor,
        props,
        hasTextSelection: includesTextStyle && hasTextSelection,
      }
    }

    const defineItem = (itemName, itemTitle, itemGroups, resolveContext) => {
      menu.defineItem({
        name: itemName,
        groups: itemGroups,
        button: buttons.text(itemTitle),
        hidden(editor) {
          return !resolveContext(editor)
        },
        active(editor) {
          const ctx = resolveContext(editor)
          if (!ctx) return false
          const { ancestor, props, hasTextSelection } = ctx
          return props.some(([cssProp, config]) => {
            if (hasTextSelection && config.types.includes("textStyle"))
              return !!editor.getAttributes("textStyle")[cssProp]
            if (ancestor) return !!ancestor.node.attrs[cssProp]
            return false
          })
        },
        command(editor) {
          const ctx = resolveContext(editor)
          if (!ctx) return
          const { ancestor, props, hasTextSelection } = ctx

          const schema = Object.fromEntries(
            props.map(([cssProp, { types: _, ...config }]) => [
              cssProp,
              { type: "string", ...config },
            ]),
          )

          const initialValues = Object.fromEntries(
            props.map(([cssProp, config]) => {
              let value = null
              if (hasTextSelection && config.types.includes("textStyle"))
                value = editor.getAttributes("textStyle")[cssProp] ?? null
              if (!value && ancestor)
                value = ancestor.node.attrs[cssProp] ?? null
              return [cssProp, value]
            }),
          )

          updateAttrsDialog(schema, { title: itemTitle })(
            editor,
            initialValues,
          ).then((attrs) => {
            if (!attrs) return

            let chain = editor.chain().focus()
            let hasTextStyleChanges = false

            for (const [cssProp, config] of props) {
              const value = attrs[cssProp] || null

              if (hasTextSelection && config.types.includes("textStyle")) {
                chain = chain.setMark("textStyle", { [cssProp]: value })
                hasTextStyleChanges = true
              }

              if (ancestor && config.types.includes(ancestor.nodeType)) {
                chain = chain.command(({ tr, state }) => {
                  const { ranges } = state.selection
                  const targetType = ancestor.nodeType
                  const seen = new Set()

                  for (const range of ranges) {
                    const { $from } = range
                    for (let depth = $from.depth; depth > 0; depth--) {
                      if ($from.node(depth).type.name === targetType) {
                        const pos = $from.before(depth)
                        if (!seen.has(pos)) {
                          seen.add(pos)
                          tr.setNodeAttribute(pos, cssProp, value)
                        }
                        break
                      }
                    }
                  }

                  if (!seen.size)
                    tr.setNodeAttribute(ancestor.pos, cssProp, value)
                  return true
                })
              }
            }

            if (hasTextStyleChanges) chain = chain.removeEmptyTextStyle()
            chain.run()
          })
        },
      })
    }

    for (const [key, contextConfig] of Object.entries(contexts)) {
      defineItem(
        `styleLoom:${key}`,
        contextConfig.title ?? key,
        contextConfig.groups ?? "marks",
        makeResolveContext(contextConfig.types ?? unclaimedTypes),
      )
    }
  },
})
