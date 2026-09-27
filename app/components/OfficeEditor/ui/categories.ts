import {
  Archive,
  Armchair,
  Bath,
  Image as ImageIcon,
  BrickWall,
  CookingPot,
  LampDesk,
  Monitor,
  Sprout,
  Table,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { CatalogItem, ObjectType } from "../types"
import { TOOLS } from "./tools"

/** A Sims-style build category grouping related asset types. */
export interface Category {
  id: string
  label: string
  icon: LucideIcon
  types: CatalogItem[]
}

export const CATEGORIES: Category[] = [
  {
    id: "structure",
    label: "Structure",
    icon: BrickWall,
    types: ["room", "wall", "door", "window", "glassWall", "glassDoor"],
  },
  { id: "desks", label: "Desks", icon: LampDesk, types: ["desk", "workstation", "deskmate"] },
  {
    id: "seating",
    label: "Seating",
    icon: Armchair,
    types: ["seat", "sofa", "armchair", "barStool"],
  },
  {
    id: "tables",
    label: "Tables",
    icon: Table,
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
    icon: Archive,
    types: ["bookshelf", "shelvingUnit", "filingCabinet", "lockers", "wardrobe"],
  },
  {
    id: "equipment",
    label: "Equipment",
    icon: Monitor,
    types: ["printer", "tvScreen", "whiteboard", "serverRack"],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    icon: CookingPot,
    types: ["kitchenCounter", "fridge", "cooler", "vendingMachine"],
  },
  {
    id: "wall",
    label: "On the wall",
    icon: ImageIcon,
    types: ["wallTv", "wallArt", "wallClock", "wallShelf"],
  },
  { id: "bathroom", label: "Bathroom", icon: Bath, types: ["toilet", "bathroomSink", "shower"] },
  {
    id: "decor",
    label: "Decor",
    icon: Sprout,
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
