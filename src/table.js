import { Table as TiptapTable } from "@tiptap/extension-table"

import { gettext, updateAttrsDialog } from "./utils.js"

const tableDialog = updateAttrsDialog(
  {
    rows: {
      type: "number",
      title: gettext("Rows"),
      format: "number",
      default: "3",
      min: "1",
      max: "100",
    },
    cols: {
      type: "number",
      title: gettext("Columns"),
      format: "number",
      default: "3",
      min: "1",
      max: "100",
    },
    withHeaderRow: {
      title: gettext("Include header row"),
      enum: ["Yes", "No"],
      default: "No",
    },
  },
  {
    title: gettext("Table Properties"),
    submitText: gettext("Insert Table"),
  },
)

export const Table = TiptapTable.extend({
  addMenuItems({ editor, buttons, menu }) {
    defineTableMenuItems({ editor, buttons, menu })
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertTableWithOptions:
        () =>
        ({ editor }) => {
          // Show table configuration dialog
          tableDialog(editor, {
            rows: "3",
            cols: "3",
            withHeaderRow: "No",
          }).then((attrs) => {
            if (attrs) {
              const config = {
                rows: Number.parseInt(attrs.rows, 10) || 3,
                cols: Number.parseInt(attrs.cols, 10) || 3,
                withHeaderRow: attrs.withHeaderRow === "Yes",
              }

              // Insert table with the configured options
              editor.chain().focus().insertTable(config).run()
            }
          })
        },
    }
  },
})

function defineTableMenuItems({ buttons, menu }) {
  const tableManipulationItem = (name, command, button) => {
    menu.defineItem({
      name,
      groups: "table",
      command,
      button,
      hidden(editor) {
        return !editor.isActive("table")
      },
    })
  }

  menu.defineItem({
    name: "table",
    groups: "table",
    command(editor) {
      editor.chain().focus().insertTableWithOptions().run()
    },
    button: buttons.material("grid_on", "Insert table"),
  })

  tableManipulationItem(
    "table:addColumnAfter",
    (editor) => {
      editor.chain().focus().addColumnAfter().run()
    },
    buttons.svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <rect x="15" y="3" width="6" height="18" rx="1" fill="#4CAF50" fill-opacity="0.3" stroke="#4CAF50"/>
      <line x1="18" y1="9" x2="18" y2="15" stroke="#4CAF50" stroke-width="2"/>
      <line x1="15" y1="12" x2="21" y2="12" stroke="#4CAF50" stroke-width="2"/>
    </svg>`,
      "Add column",
    ),
  )

  tableManipulationItem(
    "table:deleteColumn",
    (editor) => {
      editor.chain().focus().deleteColumn().run()
    },
    buttons.svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <rect x="15" y="3" width="6" height="18" rx="1" fill="#F44336" fill-opacity="0.3" stroke="#F44336"/>
      <line x1="15" y1="12" x2="21" y2="12" stroke="#F44336" stroke-width="2"/>
    </svg>`,
      "Delete column",
    ),
  )

  tableManipulationItem(
    "table:addRowAfter",
    (editor) => {
      editor.chain().focus().addRowAfter().run()
    },
    buttons.svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <rect x="3" y="15" width="18" height="6" rx="1" fill="#4CAF50" fill-opacity="0.3" stroke="#4CAF50"/>
      <line x1="12" y1="15" x2="12" y2="21" stroke="#4CAF50" stroke-width="2"/>
      <line x1="9" y1="18" x2="15" y2="18" stroke="#4CAF50" stroke-width="2"/>
    </svg>`,
      "Add row",
    ),
  )

  tableManipulationItem(
    "table:deleteRow",
    (editor) => {
      editor.chain().focus().deleteRow().run()
    },
    buttons.svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <rect x="3" y="15" width="18" height="6" rx="1" fill="#F44336" fill-opacity="0.3" stroke="#F44336"/>
      <line x1="9" y1="18" x2="15" y2="18" stroke="#F44336" stroke-width="2"/>
    </svg>`,
      "Delete row",
    ),
  )

  tableManipulationItem(
    "table:mergeCells",
    (editor) => {
      editor.chain().focus().mergeCells().run()
    },
    buttons.material("call_merge", "Merge cells"),
  )

  tableManipulationItem(
    "table:splitCell",
    (editor) => {
      editor.chain().focus().splitCell().run()
    },
    buttons.material("call_split", "Split cell"),
  )

  // Toggle header cell (works on selected cells or current cell)
  tableManipulationItem(
    "table:toggleHeaderCell",
    (editor) => {
      editor.chain().focus().toggleHeaderCell().run()
    },
    buttons.svg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <rect x="3" y="3" width="18" height="6" rx="1" fill="#2196F3" fill-opacity="0.3" stroke="#2196F3"/>
      <line x1="3" y1="9" x2="21" y2="9" stroke-width="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>`,
      "Toggle header cell",
    ),
  )
}
