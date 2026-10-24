import {
  Blockquote,
  Bold,
  BulletList,
  createTextareaEditor,
  Document,
  Dropcursor,
  Gapcursor,
  HardBreak,
  Heading,
  History,
  HorizontalRule,
  HTML,
  Italic,
  initializeEditors,
  Link,
  ListItem,
  Menu,
  NoSpellCheck,
  OrderedList,
  Paragraph,
  SpecialCharacters,
  Strike,
  Subscript,
  Superscript,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Text,
  Underline,
} from "django-prose-editor/editor"

const marker = "data-django-prose-editor-default"

function createEditor(textarea, config = null) {
  if (textarea.closest(".prose-editor")) return

  if (!config) {
    config = JSON.parse(textarea.getAttribute(marker))
  }

  // Default extension types (table explicitly excluded)
  const DEFAULT_TYPES = [
    "Blockquote",
    "Bold",
    "BulletList",
    "Heading",
    "HorizontalRule",
    "Italic",
    "Link",
    "OrderedList",
    "Strike",
    "Subscript",
    "Superscript",
    "Underline",
  ]

  const createIsTypeEnabled =
    (enabledTypes) =>
    (...types) => {
      // If no types defined, use the defaults
      const typesToCheck = enabledTypes?.length ? enabledTypes : DEFAULT_TYPES
      return !!types.find((t) => typesToCheck.includes(t))
    }
  const isTypeEnabled = createIsTypeEnabled(config.types)

  const extensions = [
    Document,
    Dropcursor,
    Gapcursor,
    Paragraph,
    HardBreak,
    Text,
    config.history && History,
    Menu,
    config.html && HTML,
    NoSpellCheck,
    config.typographic && SpecialCharacters,
    // Nodes and marks
    isTypeEnabled("Blockquote") && Blockquote,
    isTypeEnabled("Bold", "strong") && Bold,
    isTypeEnabled("BulletList", "bullet_list") && BulletList,
    isTypeEnabled("Heading") &&
      Heading.configure({ levels: config.headingLevels || [1, 2, 3, 4, 5] }),
    isTypeEnabled("HorizontalRule", "horizontal_rule") && HorizontalRule,
    isTypeEnabled("Italic", "em") && Italic,
    isTypeEnabled("Link", "link") && Link,
    isTypeEnabled("BulletList", "bullet_list", "OrderedList", "ordered_list") &&
      ListItem,
    isTypeEnabled("OrderedList", "ordered_list") && OrderedList,
    isTypeEnabled("Strike", "strikethrough") && Strike,
    isTypeEnabled("Subscript", "sub") && Subscript,
    isTypeEnabled("Superscript", "sup") && Superscript,
    isTypeEnabled("Underline") && Underline,
    // Table support
    isTypeEnabled("Table") && Table,
    isTypeEnabled("Table") && TableRow,
    isTypeEnabled("Table") && TableHeader,
    isTypeEnabled("Table") && TableCell,
  ].filter(Boolean)

  const editor = createTextareaEditor(textarea, extensions)
  const event = new CustomEvent("prose-editor:ready", {
    detail: { editor, textarea },
    bubbles: true,
  })
  textarea.dispatchEvent(event)
  return editor
}

initializeEditors((textarea) => {
  return createEditor(textarea)
}, `[${marker}]`)

// Backwards compatibility shim for django-prose-editor < 0.10
window.DjangoProseEditor = { createEditor }
