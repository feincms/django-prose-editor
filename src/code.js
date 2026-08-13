import { Code as BaseCode } from "@tiptap/extension-code"

export const Code = BaseCode.extend({
  addMenuItems({ menu, buttons }) {
    menu.defineItem({
      name: "code",
      groups: "marks",
      button: buttons.material("code", "Code"),
      command(editor) {
        editor.chain().toggleCode().focus().run()
      },
      active(editor) {
        return editor.isActive("code")
      },
      enabled(editor) {
        return editor.can().toggleCode()
      },
    })
  },
})
