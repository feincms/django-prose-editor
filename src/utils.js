// Global counter to support unique IDs for dialog form elements
let dialogId = 0

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

    if (config.picker) {
      const { fn, label, button } = config.picker
      if (!button && !label) {
        throw new Error("prose-editor: picker requires either label or button")
      }
      const pickerBtn =
        button ||
        crel("button", {
          type: "button",
          textContent: label,
        })
      pickerBtn.addEventListener("click", () => {
        fn().then((value) => {
          if (value) input.value = value
        })
      })
      widget = crel("div", { className: "prose-editor-field-with-picker" }, [
        input,
        pickerBtn,
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
