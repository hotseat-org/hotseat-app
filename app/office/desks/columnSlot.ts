/**
 * The app shell's place for a desk's card in the left column, over the sheet
 * behind the column (the scene's own layer is under it). Absent outside the
 * office shell (the phone, the standalone editor): the card stays in the scene.
 */
export const COLUMN_SLOT_ID = "office-column-slot"

/** The slot, if the shell has one on screen. */
export const getColumnSlot = () =>
  typeof document === "undefined" ? null : document.getElementById(COLUMN_SLOT_ID)
