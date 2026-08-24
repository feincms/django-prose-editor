import { OrderedList as TiptapOrderedList } from "@tiptap/extension-list"

import { crel, gettext, updateAttrsDialog } from "./utils.js"

const htmlToCssMap = {
  1: "decimal",
  a: "lower-alpha",
  A: "upper-alpha",
  i: "lower-roman",
  I: "upper-roman",
}
const cssToHtmlMap = Object.fromEntries(
  Object.entries(htmlToCssMap).map(([key, value]) => [value, key]),
)

const DEFAULT_LIST_TYPES = [
  {
    label: "1, 2, 3, ...",
    type: "decimal",
    description: gettext("Decimal numbers"),
  },
  {
    label: "a, b, c, ...",
    type: "lower-alpha",
    description: gettext("Lowercase letters"),
  },
  {
    label: "A, B, C, ...",
    type: "upper-alpha",
    description: gettext("Uppercase letters"),
  },
  {
    label: "i, ii, iii, ...",
    type: "lower-roman",
    description: gettext("Lowercase Roman numerals"),
  },
  {
    label: "I, II, III, ...",
    type: "upper-roman",
    description: gettext("Uppercase Roman numerals"),
  },
  {
    label: gettext("Bullets"),
    type: "disc",
    description: gettext("Bullets"),
  },
]

const typeToLabel = (listTypes, type) => {
  const found = listTypes.find((item) => item.type === type)
  return found ? found.label : listTypes[0].label
}

const labelToType = (listTypes, label) => {
  const found = listTypes.find((item) => item.label === label)
  return found ? found.type : listTypes[0].type
}

export const listPropertiesDialog = (listTypes) =>
  updateAttrsDialog(
    {
      start: {
        type: "number",
        title: gettext("Start at"),
        format: "number",
        default: "1",
        min: "1",
      },
      listType: {
        title: gettext("List type"),
        enum: listTypes.map((item) => item.label),
        default: listTypes[0].label,
      },
    },
    {
      title: gettext("List properties"),
      submitText: gettext("Update"),
    },
  )

/**
 * Custom OrderedList extension that overrides the default input rules
 * to prevent automatic list creation when typing "1. " at the beginning of a line.
 */
export const OrderedList = TiptapOrderedList.configure({
  // Set keepMarks and keepAttributes to default values
  keepMarks: false,
  keepAttributes: false,
  // Default HTML attributes
  HTMLAttributes: {},
}).extend({
  addInputRules() {
    // Return an empty array to disable the default input rule (1. → ordered list)
    return []
  },

  addOptions() {
    return {
      ...this.parent?.(),
      // Option to enable/disable list attributes dialog and menu
      enableListAttributes: true,
      listTypes: DEFAULT_LIST_TYPES,
    }
  },

  addAttributes() {
    const listTypes = this.options.listTypes
    const valid_types = listTypes.map(({ type }) => type)
    const parentAttributes = this.parent?.() ?? {}
    // Tiptap's own parseHTML (as of 3.27) already sniffs the HTML `type`
    // attribute as well as `list-style-type` CSS on the <ol> and on its
    // first <li> (the pattern Google Docs pastes use). Reuse it as a
    // fallback instead of reimplementing that detection ourselves.
    const parentParseHTML = parentAttributes.type?.parseHTML

    return {
      ...parentAttributes,
      type: {
        default: null,
        parseHTML: (element) => {
          // Our own data-type is authoritative when present: it is the only
          // encoding that survives round-tripping through our renderHTML,
          // and unlike the HTML `type` attribute it isn't ambiguous under
          // case-insensitive attribute matching in some browsers (e.g.
          // between `type="a"` and `type="A"`).
          const dataType = element.dataset.type?.replace("latin", "alpha")
          if (dataType && valid_types.includes(dataType)) {
            return dataType
          }

          const htmlType = parentParseHTML?.(element)
          if (htmlType && valid_types.includes(htmlToCssMap[htmlType])) {
            return htmlToCssMap[htmlType]
          }

          return valid_types[0]
        },
        renderHTML: (attributes) => ({
          type: cssToHtmlMap[attributes.type] || null,
          "data-type": attributes.type,
        }),
      },
    }
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = crel("ol", HTMLAttributes),
        contentDOM = dom
      dom.style.cssText = `list-style-type: ${node.attrs.type}`
      return { dom, contentDOM }
    }
  },

  addCommands() {
    const listTypes = this.options.listTypes

    return {
      ...this.parent?.(),
      updateListAttributes:
        () =>
        ({ editor }) => {
          // Check if list attributes dialog is enabled
          if (!this.options.enableListAttributes) {
            return false
          }

          // Get the ordered list node
          const { state } = editor
          const { selection } = state
          // Try different depths to find the list node
          let listNode
          for (let depth = 1; depth <= 3; depth++) {
            try {
              const node = selection.$anchor.node(-depth)
              if (node && node.type.name === "orderedList") {
                listNode = node
                break
              }
            } catch (_e) {
              // Node at this depth doesn't exist
            }
          }

          if (!listNode) {
            // Fallback to defaults if we can't find the node
            listNode = { attrs: { start: 1, type: "decimal" } }
          }

          // Extract current attributes
          const start = listNode?.attrs?.start || 1
          const type = listNode?.attrs?.type || "decimal"

          listPropertiesDialog(listTypes)(editor, {
            start: String(start),
            listType: typeToLabel(listTypes, type),
          }).then((attrs) => {
            if (attrs) {
              // Convert settings to attributes
              const listType = labelToType(listTypes, attrs.listType)
              const startValue = Number.parseInt(attrs.start, 10) || 1

              // Apply attributes to ordered list
              editor
                .chain()
                .focus()
                .updateAttributes("orderedList", {
                  start: startValue,
                  type: listType,
                })
                .run()
            }
          })
        },
    }
  },
})
