import { Link as BaseLink } from "@tiptap/extension-link"

import { gettext, updateAttrsDialog } from "./utils.js"

const linkDialogImpl = (editor, attrs, options) => {
  const properties = {
    href: {
      type: "string",
      title: gettext("URL"),
    },
    title: {
      type: "string",
      title: gettext("Title"),
    },
  }

  if (options.enableTarget)
    properties.openInNewWindow = {
      type: "boolean",
      title: gettext("Open in new window"),
    }

  return updateAttrsDialog(properties, {
    title: gettext("Edit Link"),
  })(editor, attrs)
}
const linkDialog = async (editor, attrs, options) => {
  attrs = attrs || {}
  attrs.openInNewWindow = attrs.target === "_blank"
  attrs = await linkDialogImpl(editor, attrs, options)
  if (attrs) {
    if (attrs.openInNewWindow) {
      attrs.target = "_blank"
      attrs.rel = "noopener"
    } else {
      attrs.target = null
      attrs.rel = null
    }
    return attrs
  }
}

export const Link = BaseLink.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      enableTarget: true,
      HTMLAttributes: {
        target: null,
        rel: null,
        class: null,
        title: "",
      },
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: this.options.HTMLAttributes.title,
      },
    }
  },

  addMenuItems({ menu, buttons }) {
    menu.defineItem({
      name: "link",
      groups: "link",
      command(editor) {
        editor.chain().addLink().focus().run()
      },
      enabled(editor) {
        return !editor.state.selection.empty || editor.isActive("link")
      },
      button: buttons.material("insert_link", "insert link"),
      active(editor) {
        return editor.isActive("link")
      },
    })

    menu.defineItem({
      name: "unlink",
      groups: "link",
      command(editor) {
        editor.chain().focus().unsetLink().run()
      },
      dom: buttons.material("link_off", "remove link"),
      hidden(editor) {
        return !editor.isActive("link")
      },
    })
  },

  addCommands() {
    return {
      ...this.parent?.(),
      addLink:
        () =>
        ({ editor }) => {
          if (!editor.state.selection.empty || editor.isActive("link")) {
            const attrs = editor.getAttributes(this.name)

            linkDialog(editor, attrs, this.options).then((attrs) => {
              if (attrs) {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange(this.name)
                  .updateAttributes(this.name, attrs)
                  .run()
              }
            })
          }
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      "Mod-k": ({ editor }) => {
        let e
        if ((e = window.event)) {
          /* Disable browser behavior of focussing the search bar or whatever */
          e.preventDefault()
        }
        editor.commands.addLink()
      },
    }
  },
})
