/**
 * How much a desk's tag shows, by how big desks are on screen: from afar a
 * dot or a small face, nearer a face and a first name, close up the whole
 * tag (desk number, name, pin). What matters to you — your desk, your
 * teammates, the desk pointed at or looked for — shows in full at any distance.
 */
export type TagDetail = "far" | "middle" | "close"

/** Screen pixels per metre from which a level shows (3D and plan alike). */
const MIDDLE_FROM = 34
const CLOSE_FROM = 62
/** Past a threshold by this much (a share) before switching: no flicker at its edge. */
const SLACK = 0.08

/**
 * The level for a scale (px per metre), given the one shown now — it holds
 * until the scale is clearly past a threshold either way.
 */
export const getTagDetail = (pixelsPerMetre: number, current: TagDetail): TagDetail => {
  const isAbove = (threshold: number, isCurrentlyAbove: boolean) =>
    pixelsPerMetre >= threshold * (isCurrentlyAbove ? 1 - SLACK : 1 + SLACK)

  if (isAbove(CLOSE_FROM, current === "close")) return "close"
  if (isAbove(MIDDLE_FROM, current !== "far")) return "middle"

  return "far"
}
