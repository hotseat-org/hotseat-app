import { isEdgeType, isMarker, isWallMounted, type CatalogItem, type ObjectType } from "../../types"
import { getCategories, type Category } from "../../catalog/rendering"
import { getTools, type ToolMeta } from "./tools"

export type { Category }

let categories: Category[] | null = null
/**
 * The catalogue's categories (registered by the presets, see
 * catalog/categories.ts) — built on first use, once they all have.
 */
export const getCatalogCategories = () => (categories ??= getCategories())

let toolMeta: Map<string, ToolMeta> | null = null
/** Label / icon / shortcut for a given tool (from the shared tool list). */
export const getToolMeta = (tool: string) =>
  (toolMeta ??= new Map(getTools().map((meta) => [meta.tool, meta]))).get(tool)

/** The category that contains a given object type (for tool ↔ tab syncing). */
export const categoryOf = (type: CatalogItem): Category | undefined =>
  getCatalogCategories().find((category) => category.types.includes(type))

/** Whether a tool is something a catalog tile arms. */
export const isCatalogItem = (tool: string): tool is CatalogItem =>
  getCatalogCategories().some((category) => (category.types as string[]).includes(tool))

/** The object type whose placement colour an item uses (a Room builds walls). */
export const colorKey = (item: CatalogItem): ObjectType => (item === "room" ? "wall" : item)

/** Furniture that stands on the floor (not structure, not wall items or paint). */
export const isRepeatable = (item: CatalogItem) =>
  item !== "room" &&
  !isEdgeType(item as ObjectType) &&
  !isWallMounted(item as ObjectType) &&
  !isMarker(item as ObjectType)
