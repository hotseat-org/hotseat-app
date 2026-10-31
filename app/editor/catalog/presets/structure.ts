import { PALETTE } from "../../palette"
import { defineItem, registerItems } from "../registry"

const OPENINGS = ["door", "glassDoor", "window"] as const

/** Walls (solid and glass), what is cut into them, and floor paint. */
export const STRUCTURE_ITEMS = {
  wall: defineItem({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: PALETTE.wall,
    edge: {
      role: "run",
      encloses: true,
      isSeeThrough: false,
      isPaintable: true,
      isPassable: false,
      hosts: OPENINGS,
    },
  }),
  door: defineItem({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: PALETTE.doorLeaf,
    isRecolorable: false,
    edge: {
      role: "opening",
      encloses: true,
      isSeeThrough: false,
      isPaintable: false,
      isPassable: true,
    },
  }),
  window: defineItem({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#f4efe6",
    edge: {
      role: "opening",
      encloses: true,
      isSeeThrough: false,
      isPaintable: true,
      isPassable: false,
    },
  }),
  glassWall: defineItem({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#5b6577",
    edge: {
      role: "run",
      encloses: true,
      isSeeThrough: true,
      isPaintable: false,
      isPassable: false,
      hosts: ["door", "glassDoor"],
    },
  }),
  glassDoor: defineItem({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#5b6577",
    edge: {
      role: "opening",
      encloses: true,
      isSeeThrough: false,
      isPaintable: false,
      isPassable: true,
    },
  }),
  /**
   * A floor paint sits at a spot and colours the ROOM containing it (so it
   * survives walls being edited).
   */
  floorPaint: defineItem({ mount: "marker", footprint: [1, 1], defaultColor: "#c9b48d" }),
}

type StructureItems = typeof STRUCTURE_ITEMS
declare module "../registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CatalogItems extends StructureItems {}
}

registerItems(STRUCTURE_ITEMS)
