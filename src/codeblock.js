import { CodeBlock as BaseCodeBlock } from "@tiptap/extension-code-block"

import { crel } from "./utils.js"

export const CodeBlock = BaseCodeBlock.extend({
  addMenuItems({ menu, buttons }) {
    menu.defineItem({
      name: "codeBlock",
      groups: "blockType nodes",
      button: buttons.material("code", "Code block"),
      option: crel("code", { textContent: "Code block" }),
      command(editor) {
        editor.chain().toggleCodeBlock().focus().run()
      },
      active(editor) {
        return editor.isActive("codeBlock")
      },
      enabled(editor) {
        return editor.can().toggleCodeBlock()
      },
    })
  },
})
