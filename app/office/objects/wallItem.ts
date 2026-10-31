import { GRID, WALL } from "~/editor/core"

/**
 * Wall items sit in a 1-square-deep footprint whose back edge is the wall's
 * centre line; this is the local z of the wall's FACE, where they hang.
 */
export const WALL_FACE = -GRID / 2 + WALL.depth / 2
