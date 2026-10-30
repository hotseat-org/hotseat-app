import type { ReactNode } from "react"
import { ACCENT, PALETTE } from "../palette"
import { GRID, type ObjectType, type SceneObject } from "../types"
import { DESKMATE_SEAT_Z, WORKSTATION_SEAT_Z } from "../objects/dimensions"
import { getItem } from "../catalog/items"
import { shade } from "./shapes"

/**
 * Furniture for the simple (top-down) view, drawn like a furnished floor
 * plan: each piece a small symbol in its own frame — metres, front = +Z, like
 * the 3D models, at their sizes — which the plan turns into place. A chair is
 * a seat, backrest and armrests on a star base; a sofa its arms, back and
 * cushions; a toilet its bowl and tank. Each also gives its silhouette, for
 * the soft shadow under it.
 */

const GLASS = "#bfe0ee"
const DARK = "#2c313c"
const CERAMIC = "#f3f1ec"
const PAPER = "#f6f3ec"
const STEEL = "#b9bcc4"
const WATER = "#cfe6f0"
const BOOKS = ["#b96f6f", "#6d90c9", "#7fa66a", "#e8c07a", "#8b7fb0", "#5f8a86"]

export interface PieceState {
  /** Desks: someone sits here on the shown day (monitor on, chair pulled in). */
  occupied?: boolean
}

export interface PieceDrawing {
  /** The symbol, in the piece's own frame. */
  node: ReactNode
  /** Its outline, for the shadow (any fill: the plan paints it). */
  silhouette: ReactNode
  /** Its height (m): taller pieces are drawn over lower ones. */
  height: number
}

/** Collects one piece's shapes; `tone` recolours them (the plan mutes some). */
class Sketch {
  readonly parts: ReactNode[] = []
  readonly outline: ReactNode[] = []
  constructor(private tone: (color: string) => string) {}

  private key() {
    return this.parts.length
  }

  rect(x0: number, z0: number, x1: number, z1: number, color: string, rx = 0.04, edge = true) {
    this.parts.push(
      <rect
        key={this.key()}
        x={Math.min(x0, x1)}
        y={Math.min(z0, z1)}
        width={Math.abs(x1 - x0)}
        height={Math.abs(z1 - z0)}
        rx={rx}
        fill={this.tone(color)}
        stroke={edge ? this.tone(shade(color, 0.78)) : undefined}
        strokeWidth={edge ? 0.018 : undefined}
      />
    )
  }
  circle(cx: number, cz: number, r: number, color: string, edge = true) {
    this.parts.push(
      <circle
        key={this.key()}
        cx={cx}
        cy={cz}
        r={r}
        fill={this.tone(color)}
        stroke={edge ? this.tone(shade(color, 0.78)) : undefined}
        strokeWidth={edge ? 0.018 : undefined}
      />
    )
  }
  ellipse(cx: number, cz: number, rx: number, rz: number, color: string, turn = 0, edge = true) {
    this.parts.push(
      <ellipse
        key={this.key()}
        cx={cx}
        cy={cz}
        rx={rx}
        ry={rz}
        transform={turn ? `rotate(${turn} ${cx} ${cz})` : undefined}
        fill={this.tone(color)}
        stroke={edge ? this.tone(shade(color, 0.8)) : undefined}
        strokeWidth={edge ? 0.015 : undefined}
      />
    )
  }
  line(x0: number, z0: number, x1: number, z1: number, color: string, width = 0.02) {
    this.parts.push(
      <line
        key={this.key()}
        x1={x0}
        y1={z0}
        x2={x1}
        y2={z1}
        stroke={this.tone(color)}
        strokeWidth={width}
        strokeLinecap="round"
      />
    )
  }
  ring(cx: number, cz: number, r: number, color: string, width = 0.03) {
    this.parts.push(
      <circle
        key={this.key()}
        cx={cx}
        cy={cz}
        r={r}
        fill="none"
        stroke={this.tone(color)}
        strokeWidth={width}
      />
    )
  }
  /** Parts drawn by `draw`, turned about a point (a chair facing the other way). */
  turned(cx: number, cz: number, degrees: number, draw: () => void) {
    const start = this.parts.length
    draw()
    const inner = this.parts.splice(start)
    this.parts.push(
      <g key={this.key()} transform={`rotate(${degrees} ${cx} ${cz})`}>
        {inner}
      </g>
    )
  }

  shadowRect(x0: number, z0: number, x1: number, z1: number, rx = 0.06) {
    this.outline.push(
      <rect key={this.outline.length} x={x0} y={z0} width={x1 - x0} height={z1 - z0} rx={rx} />
    )
  }
  shadowCircle(cx: number, cz: number, r: number) {
    this.outline.push(<circle key={this.outline.length} cx={cx} cy={cz} r={r} />)
  }

  done(height: number): PieceDrawing {
    return { node: <>{this.parts}</>, silhouette: <>{this.outline}</>, height }
  }
}

const half = (type: ObjectType): [number, number] => [
  (getItem(type).footprint[0] * GRID) / 2,
  (getItem(type).footprint[1] * GRID) / 2,
]

/** An office chair at (x, z): seat, backrest (at −Z) and arms on a star base. */
const chair = (s: Sketch, x: number, z: number, faceBack = false) => {
  s.turned(x, z, faceBack ? 180 : 0, () => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2
      s.line(x, z, x + Math.cos(a) * 0.29, z + Math.sin(a) * 0.29, PALETTE.seatLeg, 0.035)
      s.circle(x + Math.cos(a) * 0.29, z + Math.sin(a) * 0.29, 0.03, PALETTE.seatLeg, false)
    }
    s.rect(x - 0.23, z - 0.19, x + 0.23, z + 0.24, PALETTE.seat, 0.11)
    s.rect(x - 0.15, z - 0.1, x + 0.15, z + 0.14, shade(PALETTE.seat, 1.08), 0.08, false)
    s.rect(x - 0.29, z - 0.13, x - 0.21, z + 0.13, PALETTE.seatDark, 0.04)
    s.rect(x + 0.21, z - 0.13, x + 0.29, z + 0.13, PALETTE.seatDark, 0.04)
    s.rect(x - 0.26, z - 0.32, x + 0.26, z - 0.17, PALETTE.seatDark, 0.07)
  })
  s.shadowCircle(x, z, 0.3)
}

/** A desk centred at local z = dz: monitor at the back, keyboard, mouse, a mug. */
const desk = (s: Sketch, color: string, dz: number, on: boolean) => {
  s.rect(-0.8, dz - 0.45, 0.8, dz + 0.45, color, 0.05)
  s.rect(-0.76, dz - 0.41, 0.76, dz - 0.36, shade(color, 1.08), 0.02, false)
  // Monitor: stand, body and (when someone's in) its glow.
  s.rect(-0.07, dz - 0.33, 0.07, dz - 0.2, DARK, 0.03)
  s.rect(-0.34, dz - 0.36, 0.34, dz - 0.28, DARK, 0.03)
  s.line(-0.3, dz - 0.27, 0.3, dz - 0.27, on ? ACCENT : "#4a5163", 0.018)
  // Keyboard, mouse, mug and a notepad.
  s.rect(-0.24, dz + 0.04, 0.2, dz + 0.19, "#d8dbe2", 0.025)
  s.ellipse(0.3, dz + 0.12, 0.035, 0.05, "#d8dbe2")
  s.circle(-0.6, dz - 0.16, 0.055, "#d98a63")
  s.ring(-0.6, dz - 0.16, 0.035, shade("#d98a63", 0.7), 0.012)
  s.rect(0.45, dz - 0.05, 0.68, dz + 0.24, PAPER, 0.015)
  s.shadowRect(-0.8, dz - 0.45, 0.8, dz + 0.45)
}

/** A sofa or armchair `w` wide (each side): back, arms, seat cushions, pillows. */
const couch = (s: Sketch, color: string, w: number, seats: number) => {
  const back = shade(color, 0.86)
  const arm = shade(color, 0.92)
  s.rect(-w, -0.43, w, 0.43, color, 0.1)
  s.rect(-w, -0.43, w, -0.2, back, 0.09)
  s.rect(-w, -0.43, -w + 0.17, 0.43, arm, 0.08)
  s.rect(w - 0.17, -0.43, w, 0.43, arm, 0.08)
  const inner = w - 0.17
  const width = (inner * 2) / seats
  for (let i = 0; i < seats; i++) {
    const x0 = -inner + i * width
    s.rect(x0 + 0.015, -0.19, x0 + width - 0.015, 0.4, shade(color, 1.07), 0.06)
  }
  s.rect(-inner + 0.06, -0.24, -inner + 0.3, -0.04, "#e8c07a", 0.05)
  if (seats > 1) s.rect(inner - 0.3, -0.24, inner - 0.06, -0.04, "#f3e4d0", 0.05)
  s.shadowRect(-w, -0.43, w, 0.43, 0.1)
}

/** A plate with some food on it at (x, z). */
const plate = (s: Sketch, x: number, z: number, food = "#e9a35a") => {
  s.circle(x, z, 0.11, CERAMIC)
  s.circle(x, z, 0.06, food, false)
}

/** A potted plant: leaves fanning from the centre over a round pot. */
const plant = (s: Sketch, x: number, z: number, r: number, leaf: string) => {
  s.circle(x, z, r * 0.62, PALETTE.pot)
  const n = 7
  for (let i = 0; i < n; i++) {
    const deg = (i / n) * 360 + 15
    const a = (deg * Math.PI) / 180
    s.ellipse(
      x + Math.cos(a) * r * 0.5,
      z + Math.sin(a) * r * 0.5,
      r * 0.2,
      r * 0.52,
      i % 2 ? leaf : PALETTE.plantLeafDark,
      deg + 90
    )
  }
  s.circle(x, z, r * 0.22, shade(leaf, 1.12), false)
  s.shadowCircle(x, z, r)
}

/**
 * A piece of furniture as a top-down symbol (walls, doors and floor paint are
 * drawn by the plan itself; ceiling lights not at all — they'd cover the room).
 */
export const drawPiece = (
  o: SceneObject,
  state: PieceState = {},
  tone: (color: string) => string = (c) => c
): PieceDrawing | null => {
  const s = new Sketch(tone)
  const c = o.color ?? getItem(o.type).defaultColor
  const [hx, hz] = half(o.type)
  const on = state.occupied !== false
  switch (o.type) {
    case "desk":
      desk(s, c, 0, on)
      return s.done(0.8)
    // The chair first: tucked in, its front slides under the desk top.
    case "workstation":
      chair(s, 0, state.occupied ? WORKSTATION_SEAT_Z : 0.12, true)
      desk(s, c, -0.25, on)
      return s.done(1)
    case "deskmate":
      chair(s, 0, DESKMATE_SEAT_Z, true)
      desk(s, c, -0.35, on)
      return s.done(1)
    case "seat":
      chair(s, 0, 0)
      return s.done(1)
    case "barStool":
      s.ring(0, 0, 0.21, PALETTE.seatLeg, 0.025)
      s.circle(0, 0, 0.17, c)
      s.circle(0, 0, 0.11, shade(c, 1.08), false)
      s.shadowCircle(0, 0, 0.21)
      return s.done(0.8)
    case "sofa":
      couch(s, c, 1, 2)
      return s.done(0.9)
    case "armchair":
      couch(s, c, 0.46, 1)
      return s.done(0.9)

    case "coffeeTable":
      s.rect(-0.6, -0.3, 0.6, 0.3, c, 0.05)
      s.rect(-0.45, -0.18, -0.15, 0.04, "#6d90c9", 0.015)
      s.rect(-0.42, -0.14, -0.12, 0.08, "#e8c07a", 0.015)
      s.circle(0.32, 0.05, 0.06, CERAMIC)
      s.ring(0.32, 0.05, 0.04, shade(CERAMIC, 0.75), 0.012)
      s.shadowRect(-0.6, -0.3, 0.6, 0.3)
      return s.done(0.4)
    case "meetingTable":
      s.rect(-1.8, -0.75, 1.8, 0.75, c, 0.12)
      s.rect(-1.7, -0.65, 1.7, 0.65, shade(c, 1.05), 0.08, false)
      for (const [x, z, turn] of [
        [-1.1, -0.42, 0],
        [0.3, -0.42, 0],
        [-0.5, 0.42, 180],
        [0.9, 0.42, 180],
      ]) {
        s.turned(x, z, turn, () => {
          s.rect(x - 0.17, z - 0.12, x + 0.17, z + 0.12, "#c9ccd3", 0.02)
          s.line(x - 0.15, z - 0.1, x + 0.15, z - 0.1, DARK, 0.02)
        })
      }
      s.circle(1.4, 0, 0.07, WATER)
      s.circle(-1.45, 0.1, 0.06, CERAMIC)
      plant(s, 0, 0, 0.16, PALETTE.plantLeaf)
      s.shadowRect(-1.8, -0.75, 1.8, 0.75, 0.12)
      return s.done(0.8)
    case "ovalTable":
      s.rect(-1.35, -0.62, 1.35, 0.62, c, 0.62)
      s.rect(-1.2, -0.48, 1.2, 0.48, shade(c, 1.05), 0.48, false)
      s.rect(-0.7, -0.2, -0.38, 0.16, PAPER, 0.02)
      s.rect(0.42, -0.14, 0.74, 0.2, PAPER, 0.02)
      s.circle(0, 0, 0.08, WATER)
      s.shadowRect(-1.35, -0.62, 1.35, 0.62, 0.62)
      return s.done(0.8)
    case "roundTable":
      s.circle(0, 0, 0.66, c)
      s.circle(0, 0, 0.56, shade(c, 1.05), false)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        plate(s, Math.cos(a) * 0.4, Math.sin(a) * 0.4, i % 2 ? "#7fa66a" : "#e9a35a")
      }
      s.circle(0, 0, 0.1, "#c9564f")
      s.shadowCircle(0, 0, 0.66)
      return s.done(0.8)
    case "squareTable":
      s.rect(-0.4, -0.4, 0.4, 0.4, c, 0.05)
      plate(s, -0.14, 0.12)
      s.circle(0.17, -0.15, 0.055, CERAMIC)
      s.shadowRect(-0.4, -0.4, 0.4, 0.4)
      return s.done(0.8)
    case "barTable":
      s.circle(0, 0, 0.42, c)
      s.circle(0, 0, 0.34, shade(c, 1.05), false)
      s.circle(0.1, -0.08, 0.055, CERAMIC)
      s.shadowCircle(0, 0, 0.42)
      return s.done(1.1)
    case "ovalBarTable":
      s.rect(-0.9, -0.38, 0.9, 0.38, c, 0.38)
      s.rect(-0.78, -0.27, 0.78, 0.27, shade(c, 1.05), 0.27, false)
      s.circle(-0.3, 0, 0.055, CERAMIC)
      s.circle(0.35, 0.05, 0.055, WATER)
      s.shadowRect(-0.9, -0.38, 0.9, 0.38, 0.38)
      return s.done(1.1)

    case "plant":
      plant(s, 0, 0, 0.3, c)
      return s.done(0.9)
    case "planterBox":
      s.rect(-0.95, -0.21, 0.95, 0.21, c, 0.04)
      for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) {
        s.circle(x, 0, 0.17, PALETTE.plantLeafDark, false)
        s.circle(x - 0.03, -0.03, 0.12, PALETTE.plantLeaf, false)
      }
      s.shadowRect(-0.95, -0.21, 0.95, 0.21)
      return s.done(0.8)
    case "floorLamp":
      s.circle(0, 0, 0.3, "#fff2c4", false)
      s.circle(0, 0, 0.17, c)
      s.circle(0, 0, 0.07, "#fffaf0", false)
      s.shadowCircle(0, 0, 0.17)
      return s.done(1.4)
    case "trashBin":
      s.circle(0, 0, 0.16, c)
      s.circle(0, 0, 0.12, shade(c, 0.7), false)
      s.shadowCircle(0, 0, 0.16)
      return s.done(0.4)
    case "coatRack":
      s.circle(0, 0, 0.14, c)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        s.line(0, 0, Math.cos(a) * 0.16, Math.sin(a) * 0.16, shade(c, 0.7), 0.02)
      }
      s.ellipse(0.06, 0.1, 0.14, 0.08, PALETTE.seatDark, 20)
      s.ellipse(-0.08, -0.08, 0.12, 0.07, "#b96f6f", -30)
      s.circle(0, 0, 0.035, shade(c, 0.6), false)
      s.shadowCircle(0, 0, 0.16)
      return s.done(1.5)
    case "rug": {
      const x0 = -hx + 0.05
      const z0 = -hz + 0.05
      s.rect(x0, z0, -x0, -z0, c, 0.04, false)
      s.rect(x0 + 0.12, z0 + 0.12, -x0 - 0.12, -z0 - 0.12, shade(c, 1.1), 0.03, false)
      s.rect(x0 + 0.22, z0 + 0.22, -x0 - 0.22, -z0 - 0.22, c, 0.03, false)
      for (let x = x0 + 0.08; x < -x0 - 0.04; x += 0.12) {
        s.line(x, z0 - 0.04, x, z0, shade(c, 0.85), 0.015)
        s.line(x, -z0, x, -z0 + 0.04, shade(c, 0.85), 0.015)
      }
      return s.done(0.01)
    }

    case "tvScreen":
      s.rect(-0.6, -0.2, -0.45, 0.2, DARK, 0.03)
      s.rect(0.45, -0.2, 0.6, 0.2, DARK, 0.03)
      s.rect(-0.7, -0.05, 0.7, 0.04, DARK, 0.02)
      s.line(-0.66, 0.05, 0.66, 0.05, ACCENT, 0.015)
      s.shadowRect(-0.7, -0.2, 0.7, 0.2, 0.04)
      return s.done(1.6)
    case "whiteboard":
      s.rect(-0.6, -0.2, -0.5, 0.2, "#8f9aa6", 0.03)
      s.rect(0.5, -0.2, 0.6, 0.2, "#8f9aa6", 0.03)
      s.rect(-0.7, -0.05, 0.7, 0.05, "#f6f7f8", 0.02)
      for (const [x, color] of [
        [-0.2, "#c9564f"],
        [-0.1, "#4a6fae"],
        [0, "#3d6b33"],
      ] as const)
        s.circle(x, 0.08, 0.018, color, false)
      s.shadowRect(-0.7, -0.2, 0.7, 0.2, 0.04)
      return s.done(1.6)
    case "divider":
      s.rect(-hx + 0.08, -0.15, -hx + 0.2, 0.15, DARK, 0.03)
      s.rect(hx - 0.2, -0.15, hx - 0.08, 0.15, DARK, 0.03)
      s.rect(-hx + 0.05, -0.05, hx - 0.05, 0.05, c, 0.04)
      s.shadowRect(-hx + 0.05, -0.15, hx - 0.05, 0.15, 0.04)
      return s.done(1.3)

    case "toilet":
      s.rect(-0.2, -0.5, 0.2, -0.32, c, 0.05)
      s.ellipse(0, -0.06, 0.19, 0.26, c)
      s.ellipse(0, -0.03, 0.12, 0.17, WATER)
      s.circle(0, -0.41, 0.025, STEEL, false)
      s.shadowRect(-0.2, -0.5, 0.2, 0.2, 0.18)
      return s.done(0.8)
    case "shower":
      s.rect(-0.48, -0.48, 0.48, 0.48, CERAMIC, 0.03)
      s.rect(-0.48, -0.48, 0.48, -0.43, c, 0.01)
      s.rect(-0.48, -0.43, -0.43, 0.48, c, 0.01)
      for (const t of [-0.2, 0.05, 0.3]) {
        s.line(t, -0.48, t, -0.43, shade(c, 0.8), 0.008)
        s.line(-0.48, t, -0.43, t, shade(c, 0.8), 0.008)
      }
      s.line(-0.38, -0.38, 0.4, 0.4, shade(CERAMIC, 0.85), 0.012)
      s.line(-0.38, 0.4, 0.4, -0.38, shade(CERAMIC, 0.85), 0.012)
      s.circle(0, 0, 0.04, STEEL)
      s.circle(0, -0.28, 0.09, STEEL)
      s.line(-0.43, 0.46, 0.48, 0.46, GLASS, 0.03)
      s.line(0.46, -0.43, 0.46, 0.48, GLASS, 0.03)
      s.shadowRect(-0.48, -0.48, 0.48, 0.48, 0.03)
      return s.done(1.5)
    case "bathroomSink":
      s.rect(-0.45, -0.22, 0.45, 0.22, c, 0.04)
      s.ellipse(0, 0.02, 0.27, 0.15, CERAMIC)
      s.ellipse(0, 0.03, 0.2, 0.1, "#e4e1da", 0, false)
      s.circle(0, 0.03, 0.02, STEEL, false)
      s.rect(-0.03, -0.18, 0.03, -0.08, STEEL, 0.01)
      s.shadowRect(-0.45, -0.22, 0.45, 0.22)
      return s.done(0.9)

    case "bookshelf": {
      s.rect(-0.6, -0.18, 0.6, 0.18, c, 0.03)
      s.rect(-0.55, -0.13, 0.55, 0.13, shade(c, 0.75), 0.02, false)
      let x = -0.53
      let i = 0
      while (x < 0.5) {
        const w = 0.05 + ((i * 37) % 5) * 0.012
        s.rect(x, -0.11, Math.min(0.53, x + w), 0.11, BOOKS[i % BOOKS.length], 0.01, false)
        x += w + 0.008
        i++
      }
      s.shadowRect(-0.6, -0.18, 0.6, 0.18, 0.03)
      return s.done(1.5)
    }
    case "shelvingUnit":
      s.rect(-0.6, -0.18, 0.6, 0.18, c, 0.03)
      for (const [x0, x1, color] of [
        [-0.52, -0.22, "#c9a27e"],
        [-0.16, 0.12, "#b9c7d6"],
        [0.18, 0.5, "#c9a27e"],
      ] as const)
        s.rect(x0, -0.12, x1, 0.12, color, 0.02)
      s.shadowRect(-0.6, -0.18, 0.6, 0.18, 0.03)
      return s.done(1.7)
    case "filingCabinet":
      s.rect(-0.22, -0.22, 0.22, 0.22, c, 0.03)
      s.rect(-0.18, -0.18, 0.18, 0.12, shade(c, 1.06), 0.02, false)
      s.line(-0.08, 0.17, 0.08, 0.17, shade(c, 0.6), 0.025)
      s.shadowRect(-0.22, -0.22, 0.22, 0.22, 0.03)
      return s.done(0.9)
    case "lockers": {
      const n = 4
      const w = 1.44 / n
      s.rect(-0.72, -0.22, 0.72, 0.22, c, 0.03)
      for (let i = 1; i < n; i++)
        s.line(-0.72 + i * w, -0.22, -0.72 + i * w, 0.22, shade(c, 0.75), 0.015)
      for (let i = 0; i < n; i++) s.circle(-0.72 + (i + 0.75) * w, 0.17, 0.02, STEEL, false)
      s.shadowRect(-0.72, -0.22, 0.72, 0.22, 0.03)
      return s.done(1.7)
    }
    case "wardrobe":
      s.rect(-0.7, -0.45, 0.7, 0.45, c, 0.04)
      s.rect(-0.64, -0.39, 0.64, 0.35, shade(c, 1.06), 0.03, false)
      s.line(0, -0.4, 0, 0.45, shade(c, 0.7), 0.015)
      s.line(-0.1, 0.4, -0.04, 0.4, shade(c, 0.5), 0.025)
      s.line(0.04, 0.4, 0.1, 0.4, shade(c, 0.5), 0.025)
      s.shadowRect(-0.7, -0.45, 0.7, 0.45, 0.04)
      return s.done(1.75)

    case "printer":
      s.rect(-0.4, -0.35, 0.4, 0.33, c, 0.05)
      s.rect(-0.3, -0.25, 0.3, 0.05, shade(c, 0.85), 0.03)
      s.rect(-0.22, -0.2, 0.22, 0.02, PAPER, 0.01, false)
      s.rect(-0.38, 0.18, -0.08, 0.3, DARK, 0.02)
      s.circle(-0.3, 0.24, 0.015, "#6ee7a0", false)
      s.rect(-0.25, 0.33, 0.25, 0.44, PAPER, 0.01)
      s.shadowRect(-0.4, -0.35, 0.4, 0.44, 0.05)
      return s.done(0.9)
    case "vendingMachine":
      s.rect(-0.45, -0.4, 0.45, 0.4, c, 0.04)
      s.rect(-0.38, -0.3, 0.38, 0.06, shade(c, 1.1), 0.03, false)
      s.rect(-0.4, 0.24, 0.12, 0.38, DARK, 0.02)
      for (let i = 0; i < 4; i++) s.circle(-0.33 + i * 0.13, 0.31, 0.03, BOOKS[i], false)
      s.rect(0.2, 0.22, 0.38, 0.38, "#e8e2d6", 0.02)
      s.shadowRect(-0.45, -0.4, 0.45, 0.4, 0.04)
      return s.done(1.8)
    case "kitchenCounter":
      s.rect(-1, -0.45, 1, 0.45, c, 0.04)
      s.rect(-1, 0.38, 1, 0.45, shade(c, 0.85), 0.02, false)
      // A sink with its tap, and a hob.
      s.rect(-0.8, -0.3, -0.25, 0.22, STEEL, 0.06)
      s.rect(-0.74, -0.24, -0.31, 0.16, shade(STEEL, 0.85), 0.05, false)
      s.rect(-0.55, -0.42, -0.5, -0.3, shade(STEEL, 0.7), 0.01)
      s.rect(0.1, -0.32, 0.8, 0.28, DARK, 0.05)
      for (const [x, z] of [
        [0.28, -0.14],
        [0.62, -0.14],
        [0.28, 0.12],
        [0.62, 0.12],
      ])
        s.ring(x, z, 0.1, "#5c6475", 0.025)
      s.shadowRect(-1, -0.45, 1, 0.45, 0.04)
      return s.done(0.9)
    case "fridge":
      s.rect(-0.38, -0.38, 0.38, 0.38, c, 0.06)
      s.rect(-0.32, -0.32, 0.32, 0.28, shade(c, 1.04), 0.04, false)
      s.line(-0.38, 0.12, 0.38, 0.12, shade(c, 0.78), 0.015)
      s.line(0.25, 0.2, 0.25, 0.34, shade(c, 0.55), 0.03)
      s.shadowRect(-0.38, -0.38, 0.38, 0.38, 0.06)
      return s.done(1.8)
    case "cooler":
      s.rect(-0.2, -0.2, 0.2, 0.2, c, 0.04)
      s.circle(0, -0.02, 0.15, "#9fd0ea")
      s.circle(0, -0.02, 0.07, "#cfe9f6", false)
      s.circle(0, -0.02, 0.035, "#4a6fae", false)
      s.shadowRect(-0.2, -0.2, 0.2, 0.2, 0.04)
      return s.done(1.1)
    case "serverRack":
      s.rect(-0.31, -0.45, 0.31, 0.45, c, 0.03)
      for (let i = 0; i < 6; i++)
        s.line(-0.24, -0.35 + i * 0.12, 0.24, -0.35 + i * 0.12, shade(c, 1.5), 0.012)
      for (let i = 0; i < 4; i++)
        s.circle(-0.18 + i * 0.1, 0.4, 0.015, i % 3 ? "#6ee7a0" : ACCENT, false)
      s.shadowRect(-0.31, -0.45, 0.31, 0.45, 0.03)
      return s.done(1.9)

    case "wallTv":
      s.rect(-0.65, -0.21, 0.65, -0.14, DARK, 0.02)
      s.line(-0.6, -0.13, 0.6, -0.13, ACCENT, 0.012)
      return s.done(1.2)
    case "wallArt":
      s.rect(-0.36, -0.21, 0.36, -0.14, c, 0.015)
      s.line(-0.3, -0.13, 0.3, -0.13, "#9fc3c9", 0.012)
      return s.done(1.1)
    case "wallClock":
      s.rect(-0.17, -0.21, 0.17, -0.14, c, 0.03)
      return s.done(1.2)
    case "wallShelf":
      s.rect(-0.45, -0.21, 0.45, 0.02, c, 0.02)
      s.circle(-0.25, -0.08, 0.06, PALETTE.plantLeaf, false)
      s.rect(0.05, -0.15, 0.3, -0.04, "#6d90c9", 0.01)
      return s.done(0.9)

    case "ceilingLight":
      return null
    default:
      s.rect(-hx + 0.04, -hz + 0.04, hx - 0.04, hz - 0.04, c, 0.04)
      s.shadowRect(-hx + 0.04, -hz + 0.04, hx - 0.04, hz - 0.04, 0.04)
      return s.done(1)
  }
}

/** Glass for windows and glass walls/doors. */
export const WINDOW_GLASS = GLASS
