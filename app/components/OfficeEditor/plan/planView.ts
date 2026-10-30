import { toRotationStep } from "../layout"
import { isEdgeType, type SceneObject } from "../types"

/** Screen pixels per plan unit: the zoom range. */
export const MIN_K = 8
export const MAX_K = 220

/** Where the plan is looked at from: its zoom and pan. */
export interface View {
  /** Pixels per plan unit. */
  k: number
  tx: number
  ty: number
}

export type Bounds = { x0: number; x1: number; y0: number; y1: number }

/** Screen space (px) kept clear around the office when fitting it. */
export type Insets = { top: number; bottom: number; left: number; right: number }

/** The view showing `b` whole, inside a w×h screen less its insets. */
export const fitView = (b: Bounds, w: number, h: number, pad: Insets): View => {
  const aw = Math.max(1, w - pad.left - pad.right)
  const ah = Math.max(1, h - pad.top - pad.bottom)
  const bw = Math.max(1, b.x1 - b.x0)
  const bh = Math.max(1, b.y1 - b.y0)
  const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(aw / bw, ah / bh)))
  return {
    k,
    tx: pad.left + aw / 2 - ((b.x0 + b.x1) / 2) * k,
    ty: pad.top + ah / 2 - ((b.y0 + b.y1) / 2) * k,
  }
}

/**
 * The layout turned by `q` quarter turns about the origin (the same Y-rotation
 * convention as the pieces' own). Turning the world instead of the camera keeps
 * everything axis-aligned on the grid — cells and edges land on cells and
 * edges — so the drawing, its walls and its depth sort work unchanged.
 */
export const turnPoint = (x: number, z: number, q: number): [number, number] => {
  const t = (q * Math.PI) / 2
  const c = Math.round(Math.cos(t))
  const s = Math.round(Math.sin(t))
  return [x * c + z * s, -x * s + z * c]
}

export const turnObject = (o: SceneObject, q: number): SceneObject => {
  if (!q) return o
  const [x, z] = turnPoint(o.x, o.z, q)
  // Exact steps: helpers like runsAlongX expect clean values. Furniture keeps
  // its eighth (a desk at 45° stays at 45°); walls and openings, quarters.
  if (isEdgeType(o.type)) {
    const quarters = (Math.round(o.rotation / (Math.PI / 2)) + q) & 3
    return { ...o, x, z, rotation: (quarters * Math.PI) / 2 }
  }
  return { ...o, x, z, rotation: toRotationStep(o.rotation + (q * Math.PI) / 2) }
}
