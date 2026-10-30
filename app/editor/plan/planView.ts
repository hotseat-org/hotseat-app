import { toRotationStep } from "../layout"
import { clamp } from "../math"
import { isEdgeType, type SceneObject } from "../types"

/** Screen pixels per plan unit: the zoom range. */
export const MIN_ZOOM = 8
export const MAX_ZOOM = 220

/** Where the plan is looked at from: its zoom and pan. */
export interface View {
  /** Pixels per plan unit. */
  zoom: number
  offsetX: number
  offsetY: number
}

export type Bounds = { x0: number; x1: number; y0: number; y1: number }

/** Screen space (px) kept clear around the office when fitting it. */
export type Insets = { top: number; bottom: number; left: number; right: number }

/** The view showing `bounds` whole, inside a width×height screen less its insets. */
export const fitView = (
  bounds: Bounds,
  { width, height }: { width: number; height: number },
  padding: Insets
): View => {
  const availableWidth = Math.max(1, width - padding.left - padding.right)
  const availableHeight = Math.max(1, height - padding.top - padding.bottom)
  const boundsWidth = Math.max(1, bounds.x1 - bounds.x0)
  const boundsHeight = Math.max(1, bounds.y1 - bounds.y0)
  const zoom = clamp(
    Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight),
    MIN_ZOOM,
    MAX_ZOOM
  )

  return {
    zoom,
    offsetX: padding.left + availableWidth / 2 - ((bounds.x0 + bounds.x1) / 2) * zoom,
    offsetY: padding.top + availableHeight / 2 - ((bounds.y0 + bounds.y1) / 2) * zoom,
  }
}

/**
 * The layout turned by `turns` quarter turns about the origin (the same Y-rotation
 * convention as the pieces' own). Turning the world instead of the camera keeps
 * everything axis-aligned on the grid — cells and edges land on cells and
 * edges — so the drawing, its walls and its depth sort work unchanged.
 */
export const turnPoint = (x: number, z: number, turns: number): [number, number] => {
  const angle = (turns * Math.PI) / 2
  const cosine = Math.round(Math.cos(angle))
  const sine = Math.round(Math.sin(angle))

  return [x * cosine + z * sine, -x * sine + z * cosine]
}

export const turnObject = (object: SceneObject, turns: number): SceneObject => {
  if (!turns) return object

  const [x, z] = turnPoint(object.x, object.z, turns)
  // Exact steps: helpers like runsAlongX expect clean values. Furniture keeps
  // its eighth (a desk at 45° stays at 45°); walls and openings, quarters.
  if (isEdgeType(object.type)) {
    const quarters = (Math.round(object.rotation / (Math.PI / 2)) + turns) & 3

    return { ...object, x, z, rotation: (quarters * Math.PI) / 2 }
  }

  return { ...object, x, z, rotation: toRotationStep(object.rotation + (turns * Math.PI) / 2) }
}
