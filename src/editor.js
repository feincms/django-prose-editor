import "./editor.css"
import "./dialog.css"
import "./fullscreen.css"
import "./menu.css"

export * from "@tiptap/core"
export { Blockquote } from "@tiptap/extension-blockquote"
export { Bold } from "@tiptap/extension-bold"
export { Code } from "@tiptap/extension-code"
export { CodeBlock } from "@tiptap/extension-code-block"
export { Color } from "@tiptap/extension-color"
export { Document } from "@tiptap/extension-document"
export { HardBreak } from "@tiptap/extension-hard-break"
export { Heading } from "@tiptap/extension-heading"
export { Highlight } from "@tiptap/extension-highlight"
export { HorizontalRule } from "@tiptap/extension-horizontal-rule"
export { Image } from "@tiptap/extension-image"
export { Italic } from "@tiptap/extension-italic"
export { BulletList, ListItem } from "@tiptap/extension-list"
export { Paragraph } from "@tiptap/extension-paragraph"
export { Strike } from "@tiptap/extension-strike"
export { Subscript } from "@tiptap/extension-subscript"
export { Superscript } from "@tiptap/extension-superscript"
export { TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
export { Text } from "@tiptap/extension-text"
export { TextAlign } from "@tiptap/extension-text-align"
export { TextStyle } from "@tiptap/extension-text-style"
export { Underline } from "@tiptap/extension-underline"
export {
  Dropcursor,
  Gapcursor,
  Placeholder,
  TrailingNode,
} from "@tiptap/extensions"
export { Plugin } from "@tiptap/pm/state"
export { Caption, Figure } from "./figure.js"
export { Fullscreen } from "./fullscreen.js"
export * from "./history.js"
export { HTML } from "./html.js"
export { Link } from "./link.js"
export * from "./menu.js"
export { NodeClass } from "./nodeClass.js"
export { NoSpellCheck } from "./nospellcheck.js"
export { OrderedList } from "./orderedList.js"
export * as pm from "./pm.js"
export { Table } from "./table.js"
export { TextClass } from "./textClass.js"
export { Typographic } from "./typographic.js"
export * from "./utils.js"

import { Editor } from "@tiptap/core"
import { crel } from "./utils.js"

function actuallyEmpty(html) {
  const re = /^<(\w+)(\s[^>]*)?><\/\1>$/i
  return re.test(html) ? "" : html
}

export function createTextareaEditor(textarea, extensions) {
  const disabled = textarea.hasAttribute("disabled")

  const element = crel("div", {
    className: `prose-editor ${disabled ? "disabled" : ""}`,
  })
  textarea.before(element)
  element.append(textarea)

  const editor = new Editor({
    element,
    editable: !disabled,
    extensions,
    content: textarea.value,
    onUpdate({ editor }) {
      textarea.value = actuallyEmpty(editor.getHTML())
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    },
    onDestroy() {
      element.before(textarea)
      element.remove()
    },
  })

  return editor
}

export function initializeEditors(create, selector) {
  function initializeEditor(container) {
    for (const el of container.querySelectorAll(selector)) {
      if (!el.id.includes("__prefix__")) {
        create(el)
      }
    }
  }

  function initializeInlines() {
    let o
    if ((o = window.django) && (o = o.jQuery)) {
      o(document).on("formset:added", (e) => {
        initializeEditor(e.target)
      })
    }
  }

  initializeEditor(document)
  initializeInlines()
}
