import { Extension, getExtensionField } from "@tiptap/core"
import { crel, gettext } from "./utils.js"

const findExtension = (editor, extension) =>
  editor.extensionManager.extensions.find((e) => e.name === extension)

const itemDefaults = {
  enabled: () => true,
  active: () => false,
  hidden: () => false,
  update: () => {},
}

const createMenuObject = (cssClass, _definedItems, buttons) => {
  // Menu API according to specification
  const menu = {
    defineItem(definition) {
      const { name, groups, priority = 100, ...rest } = definition
      if (!name || !groups)
        throw new Error("Menu item must have name and groups")

      _definedItems[name] = {
        name,
        groups: typeof groups === "string" ? groups.split(/\s+/) : groups,
        priority,
        ...itemDefaults,
        ...rest,
      }
    },

    items(selector) {
      const parts = selector.split(/\s+/)
      const include = new Set()
      const exclude = new Set()

      for (const part of parts) {
        if (part.startsWith("-")) {
          exclude.add(part.slice(1))
        } else {
          include.add(part)
        }
      }

      return Object.values(_definedItems)
        .filter((item) => {
          const itemGroups = new Set(item.groups)
          const hasIncluded = [...include].some((g) => itemGroups.has(g))
          const hasExcluded = [...exclude].some((g) => itemGroups.has(g))
          return hasIncluded && !hasExcluded
        })
        .toSorted((a, b) => b.priority - a.priority)
    },

    buttonGroup({ editor }, items) {
      const dom = crel("div", { className: `${cssClass}__group` })
      for (const {
        button,
        enabled,
        active,
        hidden,
        update,
        command,
        name,
      } of items) {
        if (button) {
          dom.append(button)

          if (button.dataset.name) return
          button.dataset.name = name

          button.addEventListener("click", (e) => {
            editor.view.focus()
            e.preventDefault()
            if (enabled(editor) && command) {
              command(editor)
            }
          })

          editor.on("transaction", () => {
            button.classList.toggle("disabled", !enabled(editor))
            button.classList.toggle("active", !!active(editor))
            button.classList.toggle("hidden", !!hidden(editor))
            update(editor)
          })
        }
      }
      return dom
    },

    dropdown({ editor }, items) {
      const buttonWrapper = crel("div", {
        className: `${cssClass}__selected`,
      })

      // We put the contents into a .ProseMirror element so that we can easily
      // reuse editor styles
      const pickerContent = crel("div", { className: "ProseMirror" })
      const picker = crel("div", { className: `${cssClass}__picker` }, [
        pickerContent,
      ])
      const dom = crel("span", { className: `${cssClass}__dropdown` }, [
        buttonWrapper,
        picker,
      ])

      // Add all items to the picker content initially
      for (const { option, name } of items) {
        option.dataset.name = name
        pickerContent.append(option)
      }

      // Function to update item visibility based on hidden state
      const updateItemVisibility = () => {
        items.forEach((item) => {
          const isHidden = item.hidden(editor)
          item.option.classList.toggle("hidden", isHidden)
        })
      }

      // Initial visibility update
      updateItemVisibility()

      picker.popover = "auto"
      buttonWrapper.popoverTargetElement = picker
      buttonWrapper.popoverTargetAction = "toggle"

      buttonWrapper.addEventListener("click", (e) => {
        e.preventDefault()

        const rect = buttonWrapper.getBoundingClientRect()
        picker.style.left = `${window.scrollX + rect.left}px`
        picker.style.top = `${window.scrollY + rect.bottom}px`

        picker.showPopover()
      })

      picker.addEventListener("click", (e) => {
        for (const { option, command, enabled, hidden } of items) {
          if (option.contains(e.target)) {
            // Skip hidden items
            if (hidden(editor)) {
              return
            }

            editor.view.focus()
            picker.hidePopover()
            if (enabled(editor)) {
              command(editor)
            }
            return
          }
        }
      })

      let activeName = ""
      const unknownButton = buttons.material("question_mark")

      editor.on("transaction", () => {
        // Update item visibility
        updateItemVisibility()

        for (const { active, button, name, hidden } of items) {
          // Skip hidden items when determining active state
          if (hidden(editor)) {
            continue
          }

          if (active(editor)) {
            if (activeName !== name) {
              activeName = name
              buttonWrapper.textContent = ""
              buttonWrapper.append(button.cloneNode(true))
            }
            return
          }
        }

        activeName = ""
        buttonWrapper.textContent = ""
        buttonWrapper.append(unknownButton.cloneNode(true))
      })

      return dom
    },
  }
  return menu
}

const _updateMenuItems = (itemGroups, editor) => {
  if (itemGroups) {
    for (const group of itemGroups) {
      for (const item of group) {
        const { button, enabled, active, hidden, update } = item
        if (button) {
          button.classList.toggle("disabled", !enabled(editor))
          button.classList.toggle("active", !!active(editor))
          button.classList.toggle("hidden", !!hidden(editor))
          update(editor)
        }
      }
    }
  }
}

// Helper function to create menu structure from groups configuration
export const createMenuFromGroups = (groups) => {
  return function createMenu({ editor, buttons, menu }) {
    const menuStructure = []

    for (const { group, type, minItems = 1 } of groups) {
      const items = menu.items(group)
      if (items.length >= minItems) {
        if (type === "dropdown") {
          menuStructure.push(menu.dropdown({ editor, buttons }, items))
        } else {
          menuStructure.push(menu.buttonGroup({ editor, buttons }, items))
        }
      }
    }

    return menuStructure
  }
}

const defaultGroups = [
  { group: "blockType -lists", type: "dropdown", minItems: 2 },
  { group: "lists" },
  { group: "nodes -blockType -lists" },
  { group: "marks" },
  { group: "nodeClass", type: "dropdown" },
  { group: "textClass", type: "dropdown" },
  { group: "link" },
  { group: "textAlign" },
  { group: "table" },
  { group: "history" },
  { group: "utility" },
]

export const Menu = Extension.create({
  name: "menu",

  addOptions() {
    return {
      defaultItems: true,
      cssClass: "prose-menubar",
      groups: null,
      items: null,
    }
  },

  addStorage() {
    // Menu items registry - maps names to item definitions
    const _definedItems = {}
    // Menu item groups in order for layout
    const _groupOrder = []
    // Pending legacy items to be processed
    const _pendingItems = []

    const addItems = (group, itemsFunction = null, before = null) => {
      if (itemsFunction) {
        console.warn("addItems is deprecated, use menu.defineItem instead.", {
          group,
          itemsFunction,
        })
      }

      // Track group order for layout
      if (!_groupOrder.includes(group)) {
        let pos
        if (before && (pos = _groupOrder.indexOf(before)) !== -1) {
          _groupOrder.splice(pos, 0, group)
        } else {
          _groupOrder.push(group)
        }
      }

      // If itemsFunction provided, convert its items to defineItem calls
      if (itemsFunction) {
        // We'll need to execute the function to get items, but we'll do this
        // later in onCreate when we have editor and buttons available
        // For now, store the function to be processed later
        _pendingItems.push({ group, itemsFunction })
      }
    }

    const buttons = buttonsCreator(this.options.cssClass)
    const menu = createMenuObject(this.options.cssClass, _definedItems, buttons)

    return {
      _definedItems,
      _groupOrder,
      _pendingItems,
      addItems,
      menu,
      buttons,
      dom: null,
    }
  },

  onCreate({ editor }) {
    const { cssClass } = this.options
    const { _groupOrder, _pendingItems, menu, buttons } = this.storage

    if (this.options.defaultItems) {
      defineBlockTypeItems({ editor, buttons, menu })
      defineMarkMenuItems({ editor, buttons, menu })
      defineTextAlignMenuItems({ editor, buttons, menu })
      defineHistoryMenuItems({ editor, buttons, menu })
      defineUtilityMenuItems({ editor, buttons, menu })
    }

    // Process extensions that add menu items via addMenuItems
    let fn
    for (const extension of editor.extensionManager.extensions) {
      /* See @tiptap/core/src/ExtensionManager.ts */
      const context = {
        name: extension.name,
        options: extension.options,
        storage: this.editor.extensionStorage[extension.name],
        editor,
        // The schema isn't ready yet. If you need the type fetch it yourself.
        // type: getSchemaTypeByName(extension.name, this.schema),
      }
      if ((fn = getExtensionField(extension, "addMenuItems", context))) {
        fn(this.storage)
      }
    }

    let index = 0

    // Process pending items from addItems calls
    if (_pendingItems.length > 0) {
      for (const { group, itemsFunction } of _pendingItems) {
        const items = itemsFunction({
          editor,
          buttons,
          menu: this.storage.menu,
        })
        for (const item of items) {
          // Generate a unique name for legacy items
          const name = `${group}_item_${++index}`
          this.storage.menu.defineItem({
            name,
            groups: group,
            priority: 100,
            ...item,
            button: item.dom || item.button,
          })
        }
      }
      _pendingItems.length = 0 // Clear the array
    }

    // Create menubar element
    const menuDOM = crel("div", { className: cssClass })

    // Build the menu
    const creator =
      this.options.items ||
      createMenuFromGroups(this.options.groups || defaultGroups)
    const menuItems = creator({ editor, buttons, menu })
    for (const item of menuItems) {
      menuDOM.append(item)
    }

    editor.view.dom.before(menuDOM)

    // Empty transaction to invoke all on("transaction") listeners
    editor.view.dispatch(editor.state.tr)

    this.storage.dom = menuDOM
  },

  onDestroy() {
    if (this.storage.dom) {
      this.storage.dom.remove()
      this.storage.dom = null
    }
  },
})

const buttonsCreator = (cssClass) => {
  const text = (textContent, title = "", style = "") =>
    crel("span", {
      className: `${cssClass}__button`,
      style,
      textContent,
      title,
    })

  const material = (textContent, title = "") =>
    crel("span", {
      className: `${cssClass}__button material-icons`,
      textContent,
      title,
    })

  const svg = (innerHTML, title = "") =>
    crel("span", {
      className: `${cssClass}__button`,
      innerHTML,
      title,
    })

  const heading = (level) =>
    crel("span", {
      className: `${cssClass}__button ${cssClass}__button--heading material-icons`,
      title: `heading ${level}`,
      textContent: "title",
      "data-level": level,
    })

  return { text, material, svg, heading }
}

const _buttons = buttonsCreator("prose-menubar")
export const materialMenuButton = _buttons.material
export const svgMenuButton = _buttons.svg

function defineBlockTypeItems({ editor, buttons, menu }) {
  const schema = editor.schema
  const extension = findExtension(editor, "heading")
  const levels = extension ? extension.options.levels : []
  let type

  for (const level of levels) {
    menu.defineItem({
      name: `heading${level}`,
      groups: "blockType nodes headings",
      button: buttons.heading(level),
      option: crel(`h${level}`, { textContent: `Heading ${level}` }),
      active(editor) {
        return editor.isActive("heading", { level })
      },
      command(editor) {
        editor.chain().focus().toggleHeading({ level }).run()
      },
    })
  }

  if ((type = schema.nodes.bulletList)) {
    menu.defineItem({
      name: "bulletList",
      groups: "blockType lists nodes",
      command(editor) {
        editor.chain().focus().toggleBulletList().run()
      },
      button: buttons.material("format_list_bulleted", "unordered list"),
      option: crel("p", { textContent: "unordered list" }),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().toggleBulletList()
      },
    })
  }
  if ((type = schema.nodes.orderedList)) {
    menu.defineItem({
      name: "orderedList",
      groups: "blockType lists nodes",
      command(editor) {
        editor.chain().focus().toggleOrderedList().run()
      },
      button: buttons.material("format_list_numbered", "ordered list"),
      option: crel("p", { textContent: "ordered list" }),
      active(editor) {
        return editor.isActive("orderedList")
      },
      enabled(editor) {
        return editor.can().toggleOrderedList()
      },
    })

    // Add list properties button only if list attributes are enabled
    const orderedListExt = findExtension(editor, "orderedList")
    if (orderedListExt?.options.enableListAttributes) {
      menu.defineItem({
        name: "orderedListProperties",
        groups: "blockType lists",
        command(editor) {
          editor.chain().focus().updateListAttributes().run()
        },
        button: buttons.material("tune", gettext("List properties")),
        option: null,
        hidden(editor) {
          return !editor.isActive("orderedList")
        },
      })
    }
  }

  if ((type = schema.nodes.blockquote)) {
    menu.defineItem({
      name: "blockquote",
      groups: "nodes",
      command(editor) {
        editor.chain().focus().toggleBlockquote().run()
      },
      button: buttons.material("format_quote", "blockquote"),
      option: crel("p", { textContent: "blockquote" }),
      active(editor) {
        return editor.isActive("blockquote")
      },
      enabled(editor) {
        return editor.can().toggleBlockquote()
      },
    })
  }
  if ((type = schema.nodes.horizontalRule)) {
    menu.defineItem({
      name: "horizontalRule",
      groups: "nodes",
      command(editor) {
        editor.chain().focus().setHorizontalRule().run()
      },
      button: buttons.material("horizontal_rule", "horizontal rule"),
      option: crel("p", { textContent: "horizontal rule" }),
      active(_editor) {
        return false
      },
      enabled(editor) {
        return editor.can().setHorizontalRule()
      },
    })
  }
  if ((type = schema.nodes.figure)) {
    menu.defineItem({
      name: "figure",
      groups: "nodes",
      command(editor) {
        editor.chain().focus().insertFigure().run()
      },
      button: buttons.material("image", "figure"),
      option: crel("p", { textContent: "figure" }),
      active(editor) {
        return editor.isActive("figure")
      },
      enabled(editor) {
        return editor.can().insertFigure()
      },
    })
  }

  menu.defineItem({
    name: "paragraph",
    groups: "blockType nodes",
    button: buttons.material("notes", "paragraph"),
    option: crel("p", { textContent: "Paragraph" }),
    active(editor) {
      return editor.isActive("paragraph")
    },
    command(editor) {
      editor.chain().focus().setParagraph().run()
    },
  })
}

function defineMarkMenuItems({ editor, buttons, menu }) {
  const define = (markType, button) => {
    if (markType in editor.schema.marks) {
      menu.defineItem({
        name: markType,
        groups: "marks",
        command(editor) {
          editor.chain().focus().toggleMark(markType).run()
        },
        button,
        active: (editor) => editor.isActive(markType),
        enabled: (editor) => editor.can().toggleMark(markType),
      })
    }
  }

  define("bold", buttons.material("format_bold", "bold"))
  define("italic", buttons.material("format_italic", "italic"))
  define("underline", buttons.material("format_underline", "underline"))
  define("strike", buttons.material("format_strikethrough", "strike"))
  define("subscript", buttons.material("subscript", "subscript"))
  define("superscript", buttons.material("superscript", "superscript"))
}

function defineTextAlignMenuItems({ editor, buttons, menu }) {
  const define = (alignment) => {
    menu.defineItem({
      name: `textAlign:${alignment}`,
      groups: "textAlign",
      command(editor) {
        editor.chain().focus().setTextAlign(alignment).run()
      },
      button: buttons.material(`format_align_${alignment}`, alignment),
      active() {
        return editor.isActive({ textAlign: alignment })
      },
    })
  }

  if (findExtension(editor, "textAlign")) {
    define("left")
    define("center")
    define("right")
    define("justify")
  }
}

function defineHistoryMenuItems({ editor, buttons, menu }) {
  if (findExtension(editor, "history")) {
    menu.defineItem({
      name: "history:undo",
      groups: "history",
      command(editor) {
        editor.commands.undo()
      },
      enabled(editor) {
        return editor.can().undo()
      },
      button: buttons.material("undo", "undo"),
    })
    menu.defineItem({
      name: "history:redo",
      groups: "history",
      command(editor) {
        editor.commands.redo()
      },
      enabled(editor) {
        return editor.can().redo()
      },
      button: buttons.material("redo", "redo"),
    })
  }
}

function defineUtilityMenuItems({ editor, buttons, menu }) {
  if (findExtension(editor, "html")) {
    menu.defineItem({
      name: "html",
      groups: "utility",
      command(editor) {
        editor.commands.editHTML()
      },
      button: buttons.material("code", "edit HTML"),
    })
  }

  if (findExtension(editor, "fullscreen")) {
    // Create button with dynamic content based on fullscreen state
    const button = buttons.material("", gettext("Toggle fullscreen"))

    menu.defineItem({
      name: "fullscreen",
      groups: "utility",
      command(editor) {
        editor.commands.toggleFullscreen()
      },
      button,
      update: (editor) => {
        button.textContent = editor.storage.fullscreen?.fullscreen
          ? "fullscreen_exit"
          : "fullscreen"
      },
      active(editor) {
        return editor.storage.fullscreen?.fullscreen
      },
    })
  }
}
