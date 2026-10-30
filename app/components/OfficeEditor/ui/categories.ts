import { isEdgeType, isMarker, isWallMounted, type CatalogItem, type ObjectType } from "../types"
import {
  BathroomIcon,
  DecorIcon,
  DesksIcon,
  EquipmentIcon,
  KitchenIcon,
  OnTheWallIcon,
  SeatingIcon,
  StorageIcon,
  StructureIcon,
  TablesIcon,
  type CategoryIcon,
} from "./categoryIcons"
import { TOOLS } from "./tools"
import { msg } from "~/i18n/msg"

/** A Sims-style build category grouping related asset types. */
export interface Category {
  id: string
  label: string
  /** The rail icon: a little illustration of the category's most recognisable piece. */
  icon: CategoryIcon
  types: CatalogItem[]
  /** A line under the title: what to know before placing these. */
  hint?: string
}

export const CATEGORIES: Category[] = [
  {
    id: "structure",
    label: msg("Structure"),
    icon: StructureIcon,
    types: ["room", "wall", "door", "window", "glassWall", "glassDoor", "fence"],
  },
  {
    id: "desks",
    label: msg("Desks"),
    icon: DesksIcon,
    // One bookable desk, always with its chair: what people book is a seat,
    // and a desk and chair placed apart read as one but book as neither.
    types: ["workstation"],
    hint: msg("Bookable — each desk comes with its chair."),
  },
  {
    id: "seating",
    label: msg("Seating"),
    icon: SeatingIcon,
    types: ["seat", "sofa", "armchair", "barStool"],
    hint: msg("Not bookable — for meeting tables and lounges."),
  },
  {
    id: "tables",
    label: msg("Tables"),
    icon: TablesIcon,
    types: [
      "coffeeTable",
      "meetingTable",
      "roundTable",
      "squareTable",
      "ovalTable",
      "barTable",
      "ovalBarTable",
    ],
  },
  {
    id: "storage",
    label: msg("Storage"),
    icon: StorageIcon,
    types: ["bookshelf", "shelvingUnit", "filingCabinet", "lockers", "wardrobe"],
  },
  {
    id: "equipment",
    label: msg("Equipment"),
    icon: EquipmentIcon,
    types: ["printer", "tvScreen", "whiteboard", "serverRack"],
  },
  {
    id: "kitchen",
    label: msg("Kitchen"),
    icon: KitchenIcon,
    types: ["kitchenCounter", "fridge", "cooler", "vendingMachine"],
  },
  {
    id: "wall",
    label: msg("On the wall"),
    icon: OnTheWallIcon,
    types: ["wallTv", "wallArt", "wallClock", "wallShelf"],
  },
  {
    id: "bathroom",
    label: msg("Bathroom"),
    icon: BathroomIcon,
    types: ["toilet", "bathroomSink", "shower"],
  },
  {
    id: "decor",
    label: msg("Decor"),
    icon: DecorIcon,
    types: [
      "plant",
      "planterBox",
      "divider",
      "rug",
      "floorLamp",
      "ceilingLight",
      "coatRack",
      "trashBin",
    ],
  },
]

/** Label / icon / shortcut for a given tool (from the shared TOOLS list). */
export const TOOL_META = new Map(TOOLS.map((meta) => [meta.tool, meta]))

/** The category that contains a given object type (for tool ↔ tab syncing). */
export const categoryOf = (type: CatalogItem): Category | undefined =>
  CATEGORIES.find((category) => category.types.includes(type))

/** Whether a tool is something a catalog tile arms. */
export const isCatalogItem = (tool: string): tool is CatalogItem =>
  CATEGORIES.some((category) => (category.types as string[]).includes(tool))

/** The object type whose placement colour an item uses (a Room builds walls). */
export const colorKey = (item: CatalogItem): ObjectType => (item === "room" ? "wall" : item)

/** Furniture that stands on the floor (not structure, not wall items or paint). */
export const isRepeatable = (item: CatalogItem) =>
  item !== "room" &&
  !isEdgeType(item as ObjectType) &&
  !isWallMounted(item as ObjectType) &&
  !isMarker(item as ObjectType)
