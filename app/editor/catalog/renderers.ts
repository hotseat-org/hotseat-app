import type { LucideIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { DrawSymbol } from "../plan/sketch"
import type { ItemDefinition, ObjectType } from "./registry"

/** What a piece's 3D model is given. */
export interface MeshProps {
  color?: string
  /** Doors and windows: the paint of the wall they're cut into, each face. */
  wallFront?: string
  wallBack?: string
  model?: string
  /** Which look to show (see `variantOf`); undefined = the first. */
  variant?: number
  /**
   * Desks: whether someone sits here on the shown day (view mode) — lived-in
   * and monitor on, or clean and off. Undefined (editing) = lived-in.
   */
  occupied?: boolean
}

/** How an item looks: in 3D, and on the 2D plan. */
export interface ItemRenderer {
  /** The 3D model, in the piece's own frame (front = +Z). */
  Mesh: (props: MeshProps) => ReactElement
  /**
   * Its top-down symbol on the plan: null, not drawn there; unset, a plain
   * box. (Walls, what's cut into them and floor paint are drawn by the plan
   * from their traits.)
   */
  drawSymbol?: DrawSymbol | null
  /**
   * A wall run drawn merged into seamless runs, with corner posts at its
   * joints (see Walls, Posts) — not piece by piece with its Mesh.
   */
  isDrawnAsRun?: boolean
  /**
   * A run's line on the plan, unless it shows its faces' paint (walls): its
   * colour (unset: the piece's own), thickness (of a wall's) and opacity.
   */
  planRun?: { color?: string; thickness: number; opacity: number }
  /** How the editor names and offers it. */
  tile?: ItemTile
  /**
   * Its glows, in its own frame: a screen's (lit while someone's there, see
   * PieceState) or a lamp's bulb (lit once the lamps are on).
   */
  glows?: { kind: "screen" | "bulb"; position: readonly [number, number, number] }[]
  /** Its catalogue thumbnail's model, when the Mesh doesn't suit a still (unset: the Mesh). */
  Thumbnail?: (props: { color?: string }) => ReactElement
}

/** An item's tile in the catalogue (and its name everywhere else: the Inspector, commands). */
export interface ItemTile {
  /** Its name, translatable (msg). */
  label: string
  icon: LucideIcon
  /** A number-key shortcut. */
  key?: string
  /** The catalogue category it's offered in (see categories.ts); unset, not offered (older layouts' items). */
  category?: string
}

/** An item with its looks: what it is and how it's drawn, as a module brings it. */
export type ItemWithLooks = ItemDefinition & ItemRenderer

/**
 * Items with their looks, from the two halves kept apart where the server
 * needs the items without three.js (the office's furniture): every item
 * gets its looks, in the looks' order (the catalogue's).
 */
export const composeItemsWithLooks = <Items extends Record<string, ItemDefinition>>(
  items: Items,
  looks: { [Type in keyof Items]: ItemRenderer }
) =>
  Object.fromEntries(
    Object.entries(looks).map(([type, look]) => [type, { ...items[type], ...look }])
  ) as { [Type in keyof Items]: Items[Type] & ItemRenderer }

const renderers = new Map<string, ItemRenderer>()

/** Give items their looks (a preset's, or an integrator's own). Later ones replace earlier. */
export const registerRenderers = (record: { [Type in ObjectType]?: ItemRenderer }) => {
  for (const [type, renderer] of Object.entries(record)) if (renderer) renderers.set(type, renderer)
}

/** Whether an item has its looks here (a module that brings it runs in this editor). */
export const hasRenderer = (type: string) => renderers.has(type)

export const getRenderer = (type: ObjectType): ItemRenderer => {
  const renderer = renderers.get(type)
  if (!renderer) throw new Error(`No renderer for "${type}" in the catalogue`)

  return renderer
}

/** The items with a tile, in the order registered (the catalogue's order). */
export const getTiles = () =>
  [...renderers].flatMap(([type, renderer]) =>
    renderer.tile ? [{ type: type as ObjectType, ...renderer.tile }] : []
  )
