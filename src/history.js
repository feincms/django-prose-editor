import { UndoRedo } from "@tiptap/extensions"

export { UndoRedo }
// Rename back to old export
export const History = UndoRedo.extend({ name: "history" })
