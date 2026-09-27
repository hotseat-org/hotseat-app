import type { ReactNode } from "react"
import { ACCENT, DEFAULT_COLOR, PALETTE } from "../palette"
import { FOOTPRINT_CELLS, GRID, type ObjectType, type SceneObject } from "../types"
import { DESKMATE_SEAT_Z, WALL, WORKSTATION_SEAT_Z } from "../objects/dimensions"
import { boxNode, cylinderNode, floorPolygon, project, type Drawable, type Extent } from "./iso"

/**
 * Low-poly stand-ins for every piece in the simple isometric view: each is a
 * few boxes and cylinders in its own frame (front = +Z, like the 3D models),
 * turned by its rotation into world space. Sizes follow the 3D models.
 */

const GLASS = "#bfe0ee"
const DARK = "#2c313c"
const CERAMIC = "#f3f1ec"

/** Collects one piece's parts as world-space drawables. */
export class Kit {
  readonly items: Drawable[] = []
  constructor(
    private o: SceneObject,
    private wrap: (node: ReactNode) => ReactNode = (n) => n
  ) {}

  private toWorld(lx: number, lz: number): [number, number] {
    const { x, z, rotation: r } = this.o
    return [x + lx * Math.cos(r) + lz * Math.sin(r), z - lx * Math.sin(r) + lz * Math.cos(r)]
  }

  private rect(lx0: number, lz0: number, lx1: number, lz1: number) {
    const [ax, az] = this.toWorld(lx0, lz0)
    const [bx, bz] = this.toWorld(lx1, lz1)
    return {
      x0: Math.min(ax, bx),
      x1: Math.max(ax, bx),
      z0: Math.min(az, bz),
      z1: Math.max(az, bz),
    }
  }

  private add(ext: Extent, node: ReactNode) {
    this.items.push({ ext, node: this.wrap(node), order: this.items.length })
  }

  /** A box from (lx0, lz0) to (lx1, lz1) in the piece's frame, y0 … y0 + h. */
  box(
    lx0: number,
    lz0: number,
    lx1: number,
    lz1: number,
    y0: number,
    h: number,
    color: string,
    opacity = 1
  ) {
    const ext = { ...this.rect(lx0, lz0, lx1, lz1), y0, y1: y0 + h }
    this.add(ext, boxNode(ext, color, opacity))
  }

  /** An upright cylinder at (lx, lz) in the piece's frame. */
  cyl(lx: number, lz: number, r: number, y0: number, h: number, color: string) {
    const [cx, cz] = this.toWorld(lx, lz)
    const ext = { x0: cx - r, x1: cx + r, z0: cz - r, z1: cz + r, y0, y1: y0 + h }
    this.add(ext, cylinderNode(cx, cz, r, y0, y0 + h, color))
  }

  /** A leafy ball (plants): two overlapping discs, seen from anywhere. */
  foliage(lx: number, lz: number, y: number, r: number, color: string = PALETTE.plantLeaf) {
    const [cx, cz] = this.toWorld(lx, lz)
    const [px, py] = project(cx, y, cz)
    const ext = { x0: cx - r, x1: cx + r, z0: cz - r, z1: cz + r, y0: y - r, y1: y + r }
    this.add(
      ext,
      <g>
        <circle cx={px + r * 0.25} cy={py + r * 0.2} r={r} fill={PALETTE.plantLeafDark} />
        <circle cx={px} cy={py} r={r * 0.92} fill={color} />
      </g>
    )
  }

  /** Something flat on the floor (a rug). */
  flat(lx0: number, lz0: number, lx1: number, lz1: number, color: string, opacity = 1) {
    const r = this.rect(lx0, lz0, lx1, lz1)
    this.add(
      { ...r, y0: 0, y1: 0.01 },
      floorPolygon(r.x0, r.z0, r.x1, r.z1, 0.01, { fill: color, opacity })
    )
  }
}

const half = (type: ObjectType): [number, number] => [
  (FOOTPRINT_CELLS[type][0] * GRID) / 2,
  (FOOTPRINT_CELLS[type][1] * GRID) / 2,
]

/** Office chair facing +Z (backrest at −Z), or facing −Z when `flip`. */
const chair = (k: Kit, lx: number, lz: number, flip = false) => {
  const s = flip ? -1 : 1
  k.cyl(lx, lz, 0.05, 0, 0.4, PALETTE.seatLeg)
  k.box(lx - 0.3, lz - 0.3, lx + 0.3, lz + 0.3, 0.4, 0.1, PALETTE.seat)
  const back = lz - 0.3 * s
  k.box(
    lx - 0.3,
    Math.min(back, back + 0.12 * s),
    lx + 0.3,
    Math.max(back, back + 0.12 * s),
    0.5,
    0.55,
    PALETTE.seatDark
  )
}

/** A desk in its frame at local z = dz; its user sits on the +Z side. */
const desk = (k: Kit, color: string, dz: number, on: boolean) => {
  k.box(-0.76, dz - 0.41, -0.68, dz - 0.33, 0, 0.7, PALETTE.deskLeg)
  k.box(-0.76, dz + 0.33, -0.68, dz + 0.41, 0, 0.7, PALETTE.deskLeg)
  k.box(0.38, dz - 0.36, 0.76, dz + 0.36, 0, 0.7, PALETTE.deskLeg)
  k.box(-0.8, dz - 0.45, 0.8, dz + 0.45, 0.7, 0.07, color)
  k.box(-0.33, dz - 0.3, 0.33, dz - 0.25, 0.8, 0.4, on ? ACCENT : DARK)
  k.box(-0.24, dz + 0.04, 0.2, dz + 0.2, 0.77, 0.02, DARK)
}

/** Generic height of pieces drawn as a simple block (by type). */
const BLOCK: Partial<Record<ObjectType, number>> = {
  bookshelf: 1.5,
  filingCabinet: 0.9,
  lockers: 1.7,
  printer: 0.9,
  vendingMachine: 1.8,
  kitchenCounter: 0.9,
  fridge: 1.8,
  wardrobe: 1.75,
  serverRack: 1.9,
  shelvingUnit: 1.7,
  cooler: 1.1,
  bathroomSink: 0.85,
}

export interface KitState {
  /** Desks: someone sits here on the shown day (monitor on, chair out). */
  occupied?: boolean
}

/** A piece of furniture as drawables (walls and markers are drawn elsewhere). */
export const buildKit = (k: Kit, o: SceneObject, state: KitState = {}) => {
  const c = o.color ?? DEFAULT_COLOR[o.type]
  const [hx, hz] = half(o.type)
  const on = state.occupied !== false
  switch (o.type) {
    case "desk":
      desk(k, c, 0, on)
      return
    case "workstation":
      desk(k, c, -0.25, on)
      chair(k, 0, state.occupied ? WORKSTATION_SEAT_Z : 0.1, true)
      return
    case "deskmate":
      desk(k, c, -0.35, on)
      chair(k, 0, DESKMATE_SEAT_Z, true)
      return
    case "seat":
      chair(k, 0, 0)
      return
    case "sofa":
    case "armchair": {
      const w = o.type === "sofa" ? 1 : 0.46
      k.box(-w, -0.43, w, 0.43, 0.06, 0.42, c)
      k.box(-w, -0.43, w, -0.25, 0.06, 0.8, c)
      k.box(-w, -0.43, -w + 0.17, 0.43, 0.06, 0.6, c)
      k.box(w - 0.17, -0.43, w, 0.43, 0.06, 0.6, c)
      return
    }
    case "coffeeTable":
      k.box(-0.52, -0.22, 0.52, 0.22, 0.1, 0.04, c)
      k.box(-0.6, -0.3, 0.6, 0.3, 0.32, 0.06, c)
      return
    case "meetingTable":
      for (const [x, z] of [
        [-1.6, -0.55],
        [1.6, -0.55],
        [-1.6, 0.55],
        [1.6, 0.55],
      ])
        k.box(x - 0.05, z - 0.05, x + 0.05, z + 0.05, 0, 0.7, PALETTE.deskLeg)
      k.box(-1.8, -0.75, 1.8, 0.75, 0.7, 0.08, c)
      return
    case "ovalTable":
      k.box(-0.8, -0.2, -0.6, 0.2, 0, 0.7, PALETTE.deskLeg)
      k.box(0.6, -0.2, 0.8, 0.2, 0, 0.7, PALETTE.deskLeg)
      k.box(-1.35, -0.62, 1.35, 0.62, 0.7, 0.07, c)
      return
    case "squareTable":
      k.box(-0.03, -0.03, 0.03, 0.03, 0, 0.7, PALETTE.seatLeg)
      k.box(-0.4, -0.4, 0.4, 0.4, 0.7, 0.05, c)
      return
    case "roundTable":
      k.cyl(0, 0, 0.07, 0, 0.7, PALETTE.deskLeg)
      k.cyl(0, 0, 0.66, 0.7, 0.05, c)
      return
    case "barTable":
      k.cyl(0, 0, 0.26, 0, 0.04, PALETTE.seatLeg)
      k.cyl(0, 0, 0.04, 0.04, 1, PALETTE.seatLeg)
      k.cyl(0, 0, 0.42, 1.02, 0.05, c)
      return
    case "ovalBarTable":
      k.cyl(-0.45, 0, 0.04, 0, 1, PALETTE.seatLeg)
      k.cyl(0.45, 0, 0.04, 0, 1, PALETTE.seatLeg)
      k.box(-0.9, -0.38, 0.9, 0.38, 1, 0.05, c)
      return
    case "barStool":
      k.cyl(0, 0, 0.03, 0, 0.7, PALETTE.seatLeg)
      k.cyl(0, 0, 0.19, 0.7, 0.08, c)
      return
    case "plant":
      k.cyl(0, 0, 0.19, 0, 0.32, PALETTE.pot)
      k.foliage(0, 0, 0.62, 0.3, c)
      return
    case "planterBox":
      k.box(-0.95, -0.21, 0.95, 0.21, 0, 0.45, c)
      for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) k.foliage(x, 0, 0.62, 0.22)
      return
    case "floorLamp":
      k.cyl(0, 0, 0.12, 0, 0.03, DARK)
      k.cyl(0, 0, 0.02, 0.03, 1.2, DARK)
      k.cyl(0, 0, 0.16, 1.2, 0.22, c)
      return
    case "trashBin":
      k.cyl(0, 0, 0.16, 0, 0.36, c)
      return
    case "coatRack":
      k.cyl(0, 0, 0.14, 0, 0.03, c)
      k.cyl(0, 0, 0.025, 0, 1.45, c)
      k.box(-0.15, -0.05, 0.15, 0.05, 0.8, 0.55, PALETTE.seatDark)
      return
    case "rug":
      k.flat(-hx + 0.05, -hz + 0.05, hx - 0.05, hz - 0.05, c, 0.8)
      return
    case "tvScreen":
    case "whiteboard":
    case "divider": {
      const h = o.type === "divider" ? 1.27 : 1.6
      k.box(-hx + 0.08, -0.02, -hx + 0.12, 0.02, 0, h - 0.4, DARK)
      k.box(hx - 0.12, -0.02, hx - 0.08, 0.02, 0, h - 0.4, DARK)
      k.box(
        -hx + 0.05,
        -0.04,
        hx - 0.05,
        0.04,
        o.type === "divider" ? 0.12 : 0.7,
        o.type === "divider" ? 1.15 : 0.9,
        o.type === "whiteboard" ? "#f6f7f8" : c
      )
      return
    }
    case "toilet":
      k.box(-0.2, -0.5, 0.2, -0.33, 0, 0.82, c)
      k.cyl(0, -0.08, 0.19, 0, 0.42, c)
      return
    case "shower":
      k.box(-0.48, -0.48, 0.48, 0.48, 0, 0.06, CERAMIC)
      k.box(-0.48, -0.48, 0.48, -0.43, 0, 1.5, c)
      k.box(-0.48, -0.43, -0.43, 0.48, 0, 1.5, c)
      k.box(-0.43, 0.44, 0.48, 0.48, 0.06, 1.4, GLASS, 0.45)
      k.box(0.44, -0.43, 0.48, 0.44, 0.06, 1.4, GLASS, 0.45)
      return
    case "wallTv":
      k.box(-0.65, -0.2, 0.65, -0.14, 0.47, 0.74, DARK)
      return
    case "wallArt":
      k.box(-0.36, -0.2, 0.36, -0.15, 0.6, 0.52, c)
      return
    case "wallClock":
      k.box(-0.17, -0.2, 0.17, -0.15, 0.89, 0.34, c)
      return
    case "wallShelf":
      k.box(-0.45, -0.2, 0.45, 0.02, 0.87, 0.03, c)
      return
    case "ceilingLight":
      return // overhead: not drawn from this angle
    default: {
      const h = BLOCK[o.type] ?? 0.8
      // Wall-hugging pieces stand at the back of their footprint.
      k.box(-hx + 0.04, -hz + 0.04, hx - 0.04, hz - 0.04, 0, h, c)
    }
  }
}

/** Glass for windows and glass walls/doors. */
export const WINDOW_GLASS = GLASS
export const WALL_H = WALL.height
