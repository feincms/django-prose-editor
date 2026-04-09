// Global counter to support unique IDs for dialog form elements
let dialogId = 0

let _ckFuncNum = 0
const _ckCallbacks = new Map()
let _ckShimInstalled = false

const installCKShim = () => {
  if (_ckShimInstalled) return
  _ckShimInstalled = true
  window.CKEDITOR = window.CKEDITOR || {}
  window.CKEDITOR.tools = window.CKEDITOR.tools || {}
  const original = window.CKEDITOR.tools.callFunction
  window.CKEDITOR.tools.callFunction = (n, url, ...rest) => {
    original?.call(window.CKEDITOR.tools, n, url, ...rest)
    const cb = _ckCallbacks.get(+n)
    if (cb) {
      cb(url)
      _ckCallbacks.delete(+n)
    }
  }
}

export const openFilePicker = (pickerUrl) => {
  installCKShim()
  return new Promise((resolve) => {
    const n = ++_ckFuncNum
    _ckCallbacks.set(n, resolve)
    const sep = pickerUrl.includes("?") ? "&" : "?"
    window.open(
      `${pickerUrl}${sep}CKEditorFuncNum=${n}`,
      "_blank",
      "width=800,height=600",
    )
  })
}

export const crel = (tagName, attributes = null, children = []) => {
  const dom = document.createElement(tagName)
  dom.append(...children)
  if (attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      if (/^data-|^aria-|^role/.test(name)) dom.setAttribute(name, value)
      else dom[name] = value
    }
  }
  return dom
}

export const gettext = window.gettext || ((s) => s)

const formFieldForProperty = (name, config, attrValue, id) => {
  const label = crel("label", {
    htmlFor: id,
    textContent: config.title || name,
  })
  if (config.description) {
    label.append(
      crel("span", {
        className: "prose-editor-help",
        textContent: config.description,
      }),
    )
  }
  const defaultValue =
    typeof config.default === "function" ? config.default() : config.default
  const value = attrValue || defaultValue || ""
  let widget

  if (config.type === "boolean") {
    return crel("div", { className: "prose-editor-dialog-field" }, [
      crel("input", { id, name, type: "checkbox", checked: !!value }),
      label,
    ])
  }
  if (config.format === "textarea") {
    const textarea = crel("textarea", { id, name, value, cols: 80, rows: 3 })
    widget = crel(
      "div",
      { className: "prose-editor-grow-wrap", "data-value": textarea.value },
      [textarea],
    )
    textarea.addEventListener("input", () => {
      widget.dataset.value = textarea.value
    })
  } else if (config.enum) {
    widget = crel(
      "select",
      { id, name, value },
      config.enum.map((option) => crel("option", { textContent: option })),
    )
  } else {
    const attrs = {
      id,
      name,
      value,
      type: config.format || "text",
      size: 50,
    }
    if (config.min !== undefined) attrs.min = config.min
    if (config.max !== undefined) attrs.max = config.max
    if (config.required) attrs.required = "required"

    const input = crel("input", attrs)

    if (config.pickerUrl) {
      const browseBtn = crel("button", {
        type: "button",
        textContent: gettext("Browse..."),
      })
      browseBtn.addEventListener("click", () => {
        openFilePicker(config.pickerUrl).then((url) => {
          if (url) input.value = url
        })
      })
      widget = crel("div", { className: "prose-editor-field-with-picker" }, [
        input,
        browseBtn,
      ])
    } else {
      widget = input
    }
  }

  return crel("div", { className: "prose-editor-dialog-field" }, [
    label,
    widget,
  ])
}

const valueForFormField = (name, config, form) => {
  if (config.type === "boolean") {
    return !!form[name].checked
  }
  return form[name].value
}

export const updateAttrsDialog =
  (properties, options = {}) =>
  (editor, attrs) => {
    return new Promise((resolve) => {
      const submit = crel("button", {
        type: "submit",
        textContent: options.submitText || gettext("Update"),
      })
      const cancel = crel("button", {
        type: "button",
        value: "cancel",
        textContent: gettext("Cancel"),
      })

      // Create form elements
      const formElements = []

      // Add title if provided
      if (options.title) {
        formElements.push(
          crel("h3", {
            className: "prose-editor-dialog-title",
            textContent: options.title,
          }),
        )
      }

      const prefix = `prose-editor-${++dialogId}-`

      // Add form fields with dynamic enum support
      formElements.push(
        ...Object.entries(properties).map(([name, config], idx) =>
          formFieldForProperty(name, config, attrs[name], `${prefix}${idx}`),
        ),
      )

      // Create action buttons container
      const buttonContainer = crel("div", {
        className: "prose-editor-dialog-buttons",
      })

      // Add custom action buttons if provided
      if (options.actions) {
        for (const action of options.actions) {
          const actionButton = crel("button", {
            type: "button",
            textContent: action.text,
            className: action.className || "",
          })

          actionButton.addEventListener("click", (e) => {
            e.preventDefault()
            // Get current form values for the action
            const currentValues = Object.fromEntries(
              Object.entries(properties).map(([name, config]) => [
                name,
                valueForFormField(name, config, form),
              ]),
            )
            // Call the action with current form values and form reference
            action.handler(currentValues, form, editor)
          })

          buttonContainer.append(actionButton)
        }
      }

      // Add primary action buttons
      buttonContainer.append(submit, cancel)
      formElements.push(buttonContainer)

      const div = crel("div", {}, [
        crel("dialog", { className: "prose-editor-dialog" }, [
          crel("form", {}, formElements),
        ]),
      ])

      editor.view.dom.parentElement.append(div)
      const dialog = div.querySelector("dialog")
      const form = div.querySelector("form")

      cancel.addEventListener("click", () => {
        dialog.close()
      })
      dialog.addEventListener("close", () => {
        div.remove()
        resolve(null)
      })
      submit.addEventListener("click", (e) => {
        e.preventDefault()
        if (form.reportValidity()) {
          div.remove()
          resolve(
            Object.fromEntries(
              Object.entries(properties).map(([name, config]) => [
                name,
                valueForFormField(name, config, form),
              ]),
            ),
          )
        }
      })
      dialog.showModal()
    })
  }
