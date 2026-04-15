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
    const byType = {}
    for (const [cssProp, { types }] of Object.entries(
      this.options.properties,
    )) {
      for (const type of types) {
        ;(byType[type] ??= {})[cssProp] = {
          default: null,
          parseHTML: (el) => el.style.getPropertyValue(cssProp) || null,
          renderHTML: (attrs) =>
            attrs[cssProp] ? { style: `${cssProp}: ${attrs[cssProp]}` } : {},
        }
      }
    }
    return Object.entries(byType).map(([type, attributes]) => ({
      types: [type],
      attributes,
    }))
  },

  addMenuItems({ buttons, menu }) {
    const allProperties = Object.entries(this.options.properties)
    const { contexts } = this.options

    const claimedTypes = new Set(
      Object.values(contexts).flatMap((c) => c.types ?? []),
    )
    const unclaimedTypes = [
      ...new Set(allProperties.flatMap(([, c]) => c.types)),
    ].filter((t) => !claimedTypes.has(t))

    // Returns a resolveContext function for the given target types.
    // nodeTypes and includesTextStyle are pre-computed once per context.
    const makeResolveContext = (targetTypes) => {
      const nodeTypes = targetTypes.filter((t) => t !== "textStyle")
      const includesTextStyle = targetTypes.includes("textStyle")

      return (editor) => {
        const { selection } = editor.state
        const hasTextSelection =
          includesTextStyle && !selection.empty && !selection.node

        let ancestor = null
        if (nodeTypes.length) {
          // NodeSelection: $from sits before the node's opening token so the
          // ancestor walk below would never find the node itself.
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
            (hasTextSelection && c.types.includes("textStyle")) ||
            (ancestor && c.types.includes(ancestor.nodeType)),
        )
        return props.length ? { ancestor, props, hasTextSelection } : null
      }
    }

    for (const [key, contextConfig] of Object.entries(contexts)) {
      const resolveContext = makeResolveContext(
        contextConfig.types ?? unclaimedTypes,
      )
      const itemTitle = contextConfig.title ?? key

      menu.defineItem({
        name: `styleLoom:${key}`,
        groups: contextConfig.groups ?? "marks",
        button: buttons.text(itemTitle),
        hidden: (editor) => !resolveContext(editor),
        active(editor) {
          const ctx = resolveContext(editor)
          if (!ctx) return false
          const { ancestor, props, hasTextSelection } = ctx
          return props.some(([cssProp, config]) =>
            hasTextSelection && config.types.includes("textStyle")
              ? !!editor.getAttributes("textStyle")[cssProp]
              : !!ancestor?.node.attrs[cssProp],
          )
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
            props.map(([cssProp, config]) => [
              cssProp,
              (hasTextSelection && config.types.includes("textStyle")
                ? editor.getAttributes("textStyle")[cssProp]
                : ancestor?.node.attrs[cssProp]) ?? null,
            ]),
          )

          updateAttrsDialog(schema, { title: itemTitle })(
            editor,
            initialValues,
          ).then((attrs) => {
            if (!attrs) return

            const textStyleAttrs = {}
            const nodeProps = []

            for (const [cssProp, config] of props) {
              const value = attrs[cssProp] || null
              if (hasTextSelection && config.types.includes("textStyle"))
                textStyleAttrs[cssProp] = value
              if (ancestor && config.types.includes(ancestor.nodeType))
                nodeProps.push([cssProp, value])
            }

            let chain = editor.chain().focus()

            if (Object.keys(textStyleAttrs).length)
              chain = chain
                .setMark("textStyle", textStyleAttrs)
                .removeEmptyTextStyle()

            if (nodeProps.length) {
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
                        for (const [cssProp, value] of nodeProps)
                          tr.setNodeAttribute(pos, cssProp, value)
                      }
                      break
                    }
                  }
                }

                if (!seen.size)
                  for (const [cssProp, value] of nodeProps)
                    tr.setNodeAttribute(ancestor.pos, cssProp, value)

                return true
              })
            }

            chain.run()
          })
        },
      })
    }
  },
})
