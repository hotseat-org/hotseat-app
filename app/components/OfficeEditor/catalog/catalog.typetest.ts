import type { OpeningType, WallType } from "."

/** Compile-time checks: the edge types the catalogue derives. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
export const wallTypes: Equals<WallType, "wall" | "glassWall" | "fence"> = true
export const openingTypes: Equals<OpeningType, "door" | "window" | "glassDoor"> = true
