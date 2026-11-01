import { defineItem, registerItems } from "../registry"

/**
 * The ways between floors: stairs, from their floor up to the one above —
 * eight steps, arriving at their back end — and a lift, a shaft through
 * every floor at its spot, its doors at the front. Placed on one floor, they
 * show on the others they reach (see FloorStack), open the floor above them,
 * and the way to a desk upstairs goes through them.
 */
export const CIRCULATION_ITEMS = {
  stairs: defineItem({
    footprint: [2, 6],
    defaultColor: "#c9b79c",
    hasLooks: false,
    linksFloors: "above",
  }),
  lift: defineItem({
    footprint: [3, 3],
    defaultColor: "#8e99a8",
    linksFloors: "all",
  }),
}

type CirculationItems = typeof CIRCULATION_ITEMS
declare module "../registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CatalogItems extends CirculationItems {}
}

registerItems(CIRCULATION_ITEMS)
