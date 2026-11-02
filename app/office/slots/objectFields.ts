/**
 * The office's fields on placed pieces (desks), added to the editor's
 * SceneObject — saved with the layout, and read by the server (bookings,
 * residents, insights).
 */
declare module "~/editor/types" {
  interface ObjectFields {
    /** Desks: a seat label, e.g. "D-3". */
    label?: string
    /** Desks: who sits here (the member's email). */
    assignee?: string
    /** Desks: what it offers (DESK_FEATURES ids, e.g. "standing") — set by admins, filtered on. */
    features?: string[]
    /** Desks: the zone (team neighbourhood) it belongs to, by name. */
    zone?: string
    /** Neon signs: what it says (see catalog/neonSign.ts). */
    signText?: string
  }
}

export {}
