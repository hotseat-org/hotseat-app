import type { CatalogItem, ObjectType } from "../types"
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

/** A Sims-style build category grouping related asset types. */
export interface Category {
  id: string
  label: string
  /** The rail icon: a little illustration of the category's most recognisable piece. */
  icon: CategoryIcon
  types: CatalogItem[]
}

export const CATEGORIES: Category[] = [
  {
    id: "structure",
    label: "Structure",
    icon: StructureIcon,
    types: ["room", "wall", "door", "window", "glassWall", "glassDoor"],
  },
  {
    id: "desks",
    label: "Desks",
    icon: DesksIcon,
    types: ["desk", "workstation", "deskmate"],
  },
  {
    id: "seating",
    label: "Seating",
    icon: SeatingIcon,
    types: ["seat", "sofa", "armchair", "barStool"],
  },
  {
    id: "tables",
    label: "Tables",
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
    label: "Storage",
    icon: StorageIcon,
    types: ["bookshelf", "shelvingUnit", "filingCabinet", "lockers", "wardrobe"],
  },
  {
    id: "equipment",
    label: "Equipment",
    icon: EquipmentIcon,
    types: ["printer", "tvScreen", "whiteboard", "serverRack"],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    icon: KitchenIcon,
    types: ["kitchenCounter", "fridge", "cooler", "vendingMachine"],
  },
  {
    id: "wall",
    label: "On the wall",
    icon: OnTheWallIcon,
    types: ["wallTv", "wallArt", "wallClock", "wallShelf"],
  },
  {
    id: "bathroom",
    label: "Bathroom",
    icon: BathroomIcon,
    types: ["toilet", "bathroomSink", "shower"],
  },
  {
    id: "decor",
    label: "Decor",
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
export const TOOL_META = new Map(TOOLS.map((t) => [t.tool, t]))

/** The category that contains a given object type (for tool ↔ tab syncing). */
export const categoryOf = (type: CatalogItem): Category | undefined =>
  CATEGORIES.find((c) => c.types.includes(type))

/** Whether a tool is something a catalog tile arms. */
export const isCatalogItem = (tool: string): tool is CatalogItem =>
  CATEGORIES.some((c) => (c.types as string[]).includes(tool))

/** The object type whose placement colour an item uses (a Room builds walls). */
export const colorKey = (item: CatalogItem): ObjectType => (item === "room" ? "wall" : item)
