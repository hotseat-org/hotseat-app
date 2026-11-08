/**
 * Whether a view is closer than the whole office's fit — the 3D camera's and
 * the flat plan's alike (the office shell's headline folds into its masthead).
 * Apart, in and out, so it doesn't flicker at the edge: in past 1.12× the fit's
 * zoom, out again below 1.04×.
 */
const ZOOMED_IN_ABOVE = 1.12
const ZOOMED_OUT_BELOW = 1.04

/** From the zoom as a ratio of the fit's, and whether it was zoomed in. */
export const getIsZoomedIn = (ratio: number, wasZoomedIn: boolean) =>
  wasZoomedIn ? ratio >= ZOOMED_OUT_BELOW : ratio > ZOOMED_IN_ABOVE
