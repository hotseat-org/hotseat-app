import { DEFAULT_NEON_COLOR } from "./neonSign"
import { PALETTE, defineItem, registerItems } from "~/editor/core"

/** Furniture: what stands on the floor, hangs on walls or from the ceiling. */
export const FURNITURE_ITEMS = {
  desk: defineItem({
    footprint: [4, 2],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
    // No longer placed: a copy would place one anew.
    isCopyable: false,
    tags: ["desk", "retiredDesk"],
  }),
  seat: defineItem({ footprint: [2, 2], defaultColor: PALETTE.seat }),
  plant: defineItem({ footprint: [1, 1], defaultColor: PALETTE.plantLeaf }),
  workstation: defineItem({
    footprint: [4, 3],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
    tags: ["desk"],
  }),
  deskmate: defineItem({
    footprint: [4, 4],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
    // No longer placed: a copy would place one anew.
    isCopyable: false,
    tags: ["desk", "retiredDesk"],
  }),
  sofa: defineItem({ footprint: [4, 2], defaultColor: "#5f8a86", hasLooks: true }),
  coffeeTable: defineItem({ footprint: [3, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  meetingTable: defineItem({ footprint: [8, 4], defaultColor: PALETTE.deskTop, hasLooks: true }),
  bookshelf: defineItem({ footprint: [3, 1], defaultColor: PALETTE.deskLeg }),
  rug: defineItem({ footprint: [6, 4], defaultColor: "#b96f6f", isUnderlay: true }),
  cooler: defineItem({ footprint: [1, 1], defaultColor: "#e8edf2" }),
  filingCabinet: defineItem({ footprint: [1, 1], defaultColor: "#8f9aa6" }),
  lockers: defineItem({ footprint: [3, 1], defaultColor: "#5f7d9a" }),
  printer: defineItem({ footprint: [2, 2], defaultColor: "#e8edf2" }),
  tvScreen: defineItem({ footprint: [3, 1], defaultColor: PALETTE.deskLeg }),
  whiteboard: defineItem({ footprint: [3, 1], defaultColor: "#b9bcc4" }),
  vendingMachine: defineItem({ footprint: [2, 2], defaultColor: "#c9564f" }),
  floorLamp: defineItem({ footprint: [1, 1], defaultColor: "#f0e2c0" }),
  trashBin: defineItem({ footprint: [1, 1], defaultColor: "#5b6577" }),
  kitchenCounter: defineItem({ footprint: [4, 2], defaultColor: "#d9cbb4" }),
  fridge: defineItem({ footprint: [2, 2], defaultColor: "#e8edf2" }),
  armchair: defineItem({ footprint: [2, 2], defaultColor: "#c0876a", hasLooks: true }),
  ceilingLight: defineItem({ mount: "ceiling", footprint: [2, 2], defaultColor: "#3d4657" }),
  wardrobe: defineItem({ footprint: [3, 2], defaultColor: "#c9a27e" }),
  barStool: defineItem({ footprint: [1, 1], defaultColor: "#d98a63" }),
  barTable: defineItem({ footprint: [2, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  toilet: defineItem({ footprint: [1, 2], defaultColor: "#f3f1ec" }),
  shower: defineItem({ footprint: [2, 2], defaultColor: "#9fc3c9" }),
  bathroomSink: defineItem({ footprint: [2, 1], defaultColor: "#6d7f99" }),
  roundTable: defineItem({ footprint: [3, 3], defaultColor: PALETTE.deskTop, hasLooks: true }),
  squareTable: defineItem({ footprint: [2, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  ovalTable: defineItem({ footprint: [6, 3], defaultColor: PALETTE.deskTop, hasLooks: true }),
  ovalBarTable: defineItem({ footprint: [4, 2], defaultColor: PALETTE.deskTop, hasLooks: true }),
  serverRack: defineItem({ footprint: [2, 2], defaultColor: "#2c313c" }),
  shelvingUnit: defineItem({ footprint: [3, 1], defaultColor: "#e9e1d4" }),
  wallTv: defineItem({ mount: "wall", footprint: [3, 1], defaultColor: "#2c313c", hasLooks: true }),
  wallArt: defineItem({
    mount: "wall",
    footprint: [2, 1],
    defaultColor: "#c9946a",
    hasLooks: true,
  }),
  wallClock: defineItem({ mount: "wall", footprint: [1, 1], defaultColor: "#3d4657" }),
  wallShelf: defineItem({
    mount: "wall",
    footprint: [2, 1],
    defaultColor: PALETTE.deskTop,
    hasLooks: true,
  }),
  coatRack: defineItem({ footprint: [1, 1], defaultColor: PALETTE.deskLeg, hasLooks: true }),
  planterBox: defineItem({ footprint: [4, 1], defaultColor: "#8f9aa6", hasLooks: true }),
  divider: defineItem({ footprint: [4, 1], defaultColor: "#5f8a86" }),
  loungeBench: defineItem({ footprint: [6, 2], defaultColor: "#c0876a", hasLooks: true }),
  beanBag: defineItem({ footprint: [2, 2], defaultColor: "#e9876a" }),
  coffeeStation: defineItem({ footprint: [2, 2], defaultColor: "#3d4657" }),
  diningTable: defineItem({ footprint: [6, 4], defaultColor: PALETTE.deskTop }),
  receptionDesk: defineItem({ footprint: [6, 3], defaultColor: "#f3ead8" }),
  tableFootball: defineItem({ footprint: [3, 2], defaultColor: "#8f6a4a" }),
  pingPongTable: defineItem({ footprint: [6, 4], defaultColor: "#3f6a9a" }),
  dartboard: defineItem({ mount: "wall", footprint: [2, 1], defaultColor: "#2c313c" }),
  tallPlant: defineItem({ footprint: [2, 2], defaultColor: PALETTE.plantLeaf, hasLooks: true }),
  hangingPlant: defineItem({
    mount: "ceiling",
    footprint: [1, 1],
    defaultColor: PALETTE.plantLeaf,
  }),
  mossWall: defineItem({ mount: "wall", footprint: [4, 1], defaultColor: "#6b9159" }),
  photoWall: defineItem({
    mount: "wall",
    footprint: [3, 1],
    defaultColor: "#3d4657",
    hasLooks: true,
  }),
  // Its colour is one of the tubes' (the sign's own section offers them), not the swatches'.
  neonSign: defineItem({
    mount: "wall",
    footprint: [4, 1],
    defaultColor: DEFAULT_NEON_COLOR,
    isRecolorable: false,
  }),
}

type FurnitureItems = typeof FURNITURE_ITEMS
declare module "~/editor/catalog/registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CatalogItems extends FurnitureItems {}
}

// Registered here as well as through the office module: the server asks the
// furniture's traits (isSeatable) without an editor.
registerItems(FURNITURE_ITEMS)
