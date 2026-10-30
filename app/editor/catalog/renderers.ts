import type { LucideIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { DrawSymbol } from "../plan/sketch"
import type { ObjectType } from "./registry"

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

/** How a kind looks: in 3D, and on the 2D plan. */
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

/** A kind's tile in the catalogue (and its name everywhere else: the Inspector, commands). */
export interface ItemTile {
  /** Its name, translatable (msg). */
  label: string
  icon: LucideIcon
  /** A number-key shortcut. */
  key?: string
  /** The catalogue category it's offered in (see categories.ts); unset, not offered (older layouts' kinds). */
  category?: string
}

const renderers = new Map<string, ItemRenderer>()

/** Give kinds their looks (a preset's, or an integrator's own). Later ones replace earlier. */
export const registerRenderers = (record: { [Type in ObjectType]?: ItemRenderer }) => {
  for (const [type, renderer] of Object.entries(record)) if (renderer) renderers.set(type, renderer)
}

export const getRenderer = (type: ObjectType): ItemRenderer => {
  const renderer = renderers.get(type)
  if (!renderer) throw new Error(`No renderer for "${type}" in the catalogue`)
  return renderer
}

/** The kinds with a tile, in the order registered (the catalogue's order). */
export const getTiles = () =>
  [...renderers].flatMap(([type, renderer]) =>
    renderer.tile ? [{ type: type as ObjectType, ...renderer.tile }] : []
  )
