import { OrderedList as TiptapOrderedList } from "@tiptap/extension-list"

import { gettext, updateAttrsDialog } from "./utils.js"

// Define all list types in a single source of truth
const LIST_TYPES = [
  {
    label: "1, 2, 3, ...",
    htmlType: "1",
    cssType: "decimal",
    description: gettext("Decimal numbers"),
  },
  {
    label: "a, b, c, ...",
    htmlType: "a",
    cssType: "lower-alpha",
    description: gettext("Lowercase letters"),
  },
  {
    label: "A, B, C, ...",
    htmlType: "A",
    cssType: "upper-alpha",
    description: gettext("Uppercase letters"),
  },
  {
    label: "i, ii, iii, ...",
    htmlType: "i",
    cssType: "lower-roman",
    description: gettext("Lowercase Roman numerals"),
  },
  {
    label: "I, II, III, ...",
    htmlType: "I",
    cssType: "upper-roman",
    description: gettext("Uppercase Roman numerals"),
  },
]

// Helper to convert list type label to HTML type attribute
const listTypeToHTMLType = (typeLabel) => {
  const found = LIST_TYPES.find((item) => item.label === typeLabel)
  return found ? found.htmlType : "1" // Default to decimal
}

const htmlTypeToCSSType = (type) => {
  const found = LIST_TYPES.find((item) => item.htmlType === type)
  return found ? found.cssType : "decimal" // Default to decimal
}

// Helper to convert HTML type attribute to list type label
const htmlTypeToListType = (htmlType) => {
  const found = LIST_TYPES.find((item) => item.htmlType === htmlType)
  return found ? found.label : LIST_TYPES[0].label // Default to first option
}

export const listPropertiesDialog = updateAttrsDialog(
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
      enum: LIST_TYPES.map((item) => item.label),
      default: "",
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
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("type"),
        renderHTML: (attributes) => ({
          type: attributes.type,
          "data-type": htmlTypeToCSSType(attributes.type),
        }),
      },
    }
  },

  addCommands() {
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
            listNode = { attrs: { start: 1, type: "1" } }
          }

          // Extract current attributes
          const start = listNode?.attrs?.start || 1
          const type = listNode?.attrs?.type || "1"

          listPropertiesDialog(editor, {
            start: String(start),
            listType: htmlTypeToListType(type),
          }).then((attrs) => {
            if (attrs) {
              // Convert settings to attributes
              const listType = listTypeToHTMLType(attrs.listType)
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
