import { defineItem, registerItems } from "../registry"

/**
 * Fences: runs like walls, built with the same tools, but they don't make
 * rooms (rooms, zones and the floor carry on past them), take no doors or
 * windows, and nothing hangs on them. People and furniture can't cross them.
 */
export const FENCE_ITEMS = {
  fence: defineItem({
    mount: "edge",
    footprint: [1, 1],
    defaultColor: "#b08a5e",
    edge: {
      role: "run",
      encloses: false,
      isSeeThrough: true,
      isPaintable: false,
      isPassable: false,
      hosts: [],
    },
  }),
}

type FenceItems = typeof FENCE_ITEMS
declare module "../registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ItemKinds extends FenceItems {}
}

registerItems(FENCE_ITEMS)
