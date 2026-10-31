/**
 * The office's catalogue: its furniture registered with the editor, and the
 * desk traits the office (and the server) asks about. Import desk questions
 * from here, so the furniture is always registered first.
 */
import "./furniture"
// The office editor runs the notes example too (see OfficeEditor.tsx): its
// items must be known wherever a saved layout is checked.
import "~/examples/notes/items"
import { hasTag, type ObjectType } from "~/editor/core"

/**
 * Desks no longer placed: one without a chair, and one with a pet always in its
 * chair (a pet means someone's booked it). Older layouts still have them.
 */
export const isRetiredDesk = (type: ObjectType) => hasTag(type, "retiredDesk")

/** Desks people sit at — they carry a seat label and an assignee. */
export const isSeatable = (type: ObjectType) => hasTag(type, "desk")
