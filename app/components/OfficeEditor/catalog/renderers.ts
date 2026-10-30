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
