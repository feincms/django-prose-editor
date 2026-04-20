/**
 * ClassLoom Extension
 *
 * Adds CSS class management to ProseMirror nodes and marks.
 * Works with any node type (paragraphs, tables, lists, etc.) and any mark type (italic, bold, etc.).
 *
 * Features:
 * - Multiple class groups targeting different node/mark types
 * - Combinable groups (multiple classes from same group)
 * - Special "text" type: creates one separate mark per group (allows combining multiple text class groups)
 * - Priority control: higher priority marks interrupt lower priority ones when mixed
 * - Menu integration with active state tracking
 *
 * Usage:
 *   ClassLoom.configure({
 *     groups: {
 *       tableStyles: {
 *         title: "Table Styles",
 *         type: "table",          // Any node type
 *         classes: ["table--bordered", "table--striped"]
 *       },
 *       emphasisStyles: {
 *         title: "Emphasis Styles",
 *         type: "italic",         // Any mark type
 *         classes: ["theme-color", "grey-color"]
 *       },
 *       textColors: {
 *         title: "Text Colors",
 *         type: "text",           // Special: creates new mark (one per group)
 *         combinable: true,       // Allow multiple classes from this group
 *         priority: 102,          // Higher priority interrupts lower priority marks
 *         classes: [
 *           { className: "theme-color", title: "Theme Color" },
 *           { className: "grey-color", title: "Grey" }
 *         ]
 *       }
 *     }
 *   })
 *
 * Class format: string or { className: string, title: string }
 *
 * The menu integration creates groups with a name of `classLoom:tableStyles`, `classLoom:emphasisStyles` and `classLoom:textColors` when using the configuration above. If you want the buttons or dropdowns to appear, add those classes to your Menu extension configuration.
 */

import { Extension, Mark } from "@tiptap/core"
import { crel } from "./utils.js"

// Normalize class config to always have both className and title properties
const cssClass = (c) => (typeof c === "string" ? { className: c, title: c } : c)

// Walk up the document tree from the cursor position to find ancestor nodes
const getSelectionNodes = (state, types) => {
  const nodes = []
  const positions = new Set()

  for (const range of state.selection.ranges) {
    const { $from } = range
    for (let depth = $from.depth; depth > 0; --depth) {
      const node = $from.node(depth)
      if (types.includes(node.type.name)) {
        const pos = $from.before(depth)
        if (!positions.has(pos)) {
          positions.add(pos)
          nodes.push({ typeName: node.type.name, node, depth, pos })
        }
      }
    }
  }
  return nodes
}

const getSelectionMarks = (state, types) => {
  const { $from } = state.selection
  const marks = []
  for (const mark of $from.marks()) {
    if (types.includes(mark.type.name)) {
      marks.push({ typeName: mark.type.name, mark })
    }
  }
  return marks
}

// Merge class changes into existing class string, preserving unrelated classes
// Returns sorted space-separated string for consistent HTML output
const determineClasses = (current, classes) => {
  const newClasses = new Set((current || "").split(/\s+/))
  for (const [cssClass, include] of Object.entries(classes)) {
    if (include) {
      newClasses.add(cssClass)
    } else {
      newClasses.delete(cssClass)
    }
  }
  return [...newClasses].filter(Boolean).toSorted().join(" ")
}

// Filter class string to only include classes defined in this group
// Returns null if no valid classes remain to avoid empty class attributes
const validClasses = (className, classes) => {
  className = className?.trim()
  if (!className) return null

  className = className
    .split(/\s+/)
    .filter((c) => classes.includes(c))
    .toSorted()
    .join(" ")
  return className || null
}

const isClassActive = (editor, type, className) => {
  if (editor.state.schema.nodes[type]) {
    for (const { node } of getSelectionNodes(editor.state, [type])) {
      return node.attrs.class?.split(/\s+/).includes(className)
    }
  }

  for (const { mark } of getSelectionMarks(editor.state, [type])) {
    return mark.attrs.class?.split(/\s+/).includes(className)
  }

  return false
}

export const ClassLoom = Extension.create({
  name: "classLoom",

  addOptions() {
    return {
      groups: {},
    }
  },

  addExtensions() {
    // Text classes need separate mark types to allow combining multiple text class groups
    return Object.entries(this.options.groups)
      .filter(([, group]) => group.type === "text")
      .map(([ident, group]) => {
        const classes = group.classes.map(cssClass).map((c) => c.className)
        return ClassLoomText.extend({
          name: `classLoom:${ident}`,
          // Higher priority than strong/em to ensure proper class handling
          priority: group.priority || 101,
        }).configure({ classes, ident })
      })
  },

  addGlobalAttributes() {
    // Block-level elements (paragraphs, headings, etc.) get class attributes
    // Text classes are handled separately via marks
    return [
      {
        types: [
          ...new Set(
            Object.values(this.options.groups)
              .filter((group) => group.type !== "text")
              .map((group) => group.type),
          ),
        ],
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
      // Update classes on the relevant node/mark type, merging with existing classes
      editClasses:
        (type, classes) =>
        ({ commands, state }) => {
          if (state.schema.nodes[type]) {
            const nodes = getSelectionNodes(state, [type])
            if (!nodes?.length) return false

            return commands.command(({ tr }) => {
              for (const { node, pos } of nodes) {
                tr.setNodeAttribute(
                  pos,
                  "class",
                  determineClasses(node.attrs.class, classes),
                )
              }

              return true
            })
          }

          for (const { mark } of getSelectionMarks(state, [type])) {
            commands.extendMarkRange(type)
            return commands.updateAttributes(type, {
              class: determineClasses(mark.attrs.class, classes),
            })
          }

          return false
        },
    }
  },

  addMenuItems({ buttons, menu }) {
    for (const [ident, group] of Object.entries(this.options.groups)) {
      const groupIdent = `${this.name}:${ident}`
      const cssClasses = group.classes.map(cssClass)
      // Object to clear all classes in this group when applying "default"
      const clearAll = Object.fromEntries(
        cssClasses.map(({ className }) => [className, false]),
      )

      menu.defineItem({
        name: `${groupIdent}:default`,
        groups: [this.name, groupIdent, `${this.name}:default`],
        button: buttons.text(group.title),
        option: crel("p", {
          textContent: `${group.title}: default`,
        }),
        active(editor) {
          if (group.type === "text") {
            return !editor.state.selection.$from
              .marks()
              .some(
                (mark) =>
                  mark.type.name === `classLoom:${ident}` &&
                  cssClasses.some((c) =>
                    mark.attrs.class?.split(/\s+/)?.includes(c.className),
                  ),
              )
          }
          return cssClasses.every(
            (c) => !isClassActive(editor, group.type, c.className),
          )
        },
        command(editor) {
          if (group.type === "text") {
            editor.chain().focus()[`editClasses:${ident}`](clearAll).run()
          } else {
            editor.chain().focus().editClasses(group.type, clearAll).run()
          }
        },
      })

      for (const c of cssClasses) {
        menu.defineItem({
          name: `${groupIdent}:${c.className}`,
          groups: [this.name, groupIdent],
          button: buttons.text(c.title),
          option: crel("p", { textContent: c.title }),
          active(editor) {
            if (group.type === "text") {
              // Text classes use marks, check all classLoom marks
              return !!editor.state.selection.$from
                .marks()
                .find(
                  (mark) =>
                    mark.type.name.startsWith("classLoom:") &&
                    mark.attrs.class?.split(/\s+/)?.includes(c.className),
                )
            }
            return isClassActive(editor, group.type, c.className)
          },
          command(editor) {
            // Combinable groups preserve existing classes, others clear first
            const classes = group.combinable ? {} : clearAll
            if (group.type === "text") {
              editor
                .chain()
                .focus()
                [`editClasses:${ident}`]({
                  ...classes,
                  [c.className]: true,
                })
                .run()
              return
            }
            // Toggle off if already active, otherwise apply
            editor
              .chain()
              .focus()
              .editClasses(
                group.type,
                isClassActive(editor, group.type, c.className)
                  ? { [c.className]: false }
                  : { ...classes, [c.className]: true },
              )
              .run()
          },
        })
      }
    }
  },
})

const ClassLoomText = Mark.create({
  addOptions() {
    return { classes: [], ident: null }
  },

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) =>
          validClasses(element.className, this.options.classes),
        renderHTML: (attributes) =>
          attributes.class ? { class: attributes.class } : {},
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "span",
        // Non-consuming allows multiple marks to parse the same span
        consuming: false,
        getAttrs: (element) =>
          validClasses(element.className, this.options.classes) ? {} : false,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0]
  },

  addCommands() {
    const extensionName = this.name
    const definedClasses = this.options.classes

    return {
      [`editClasses:${this.options.ident}`]:
        (classes) =>
        ({ commands, state }) => {
          const type = state.schema.marks[extensionName]

          return commands.command(({ tr }) => {
            const { empty, ranges } = tr.selection

            // Don't apply to collapsed selections (avoid invisible marks)
            if (empty) return false

            ranges.forEach((range) => {
              const from = range.$from.pos
              const to = range.$to.pos

              tr.doc.nodesBetween(from, to, (node, pos) => {
                if (node.type.name === "text") {
                  // Trim to selection boundaries to avoid modifying text outside selection
                  const trimmedFrom = Math.max(pos, from)
                  const trimmedTo = Math.min(pos + node.nodeSize, to)
                  const existingMark = node.marks.find(
                    (mark) => mark.type === type,
                  )

                  const newClass = validClasses(
                    determineClasses(existingMark?.attrs?.class, classes),
                    definedClasses,
                  )

                  if (newClass) {
                    tr.addMark(
                      trimmedFrom,
                      trimmedTo,
                      type.create({ class: newClass }),
                    )
                  } else {
                    // Remove mark entirely if no valid classes remain
                    tr.removeMark(trimmedFrom, trimmedTo, type)
                  }
                }
              })
            })

            return true
          })
        },
    }
  },
})
