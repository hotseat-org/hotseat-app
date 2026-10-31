import { ACCENT, PALETTE, DESKMATE_SEAT_Z, WORKSTATION_SEAT_Z } from "~/editor/core"
import { WINDOW_GLASS as GLASS, type DrawSymbol, type Sketch } from "~/editor/kit"
import { shade } from "~/editor/kit"
import { type ObjectType } from "~/editor/core"

/**
 * Furniture for the simple (top-down) view, drawn like a furnished floor
 * plan: each kind's symbol in its own frame (see plan/sketch.tsx). Null: not
 * drawn on the plan (ceiling lights — they'd cover the room).
 */

const DARK = "#2c313c"
const CERAMIC = "#f3f1ec"
const PAPER = "#f6f3ec"
const STEEL = "#b9bcc4"
const WATER = "#cfe6f0"
const BOOKS = ["#b96f6f", "#6d90c9", "#7fa66a", "#e8c07a", "#8b7fb0", "#5f8a86"]

type ChairOptions = { x: number; z: number; isFacingBack?: boolean }

/** An office chair at (x, z): seat, backrest (at −Z) and arms on a star base. */
const chair = (sketch: Sketch, { x, z, isFacingBack = false }: ChairOptions) => {
  sketch.turned(x, z, isFacingBack ? 180 : 0, () => {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.PI / 2
      sketch.line(
        x,
        z,
        x + Math.cos(angle) * 0.29,
        z + Math.sin(angle) * 0.29,
        PALETTE.seatLeg,
        0.035
      )
      sketch.circle(
        x + Math.cos(angle) * 0.29,
        z + Math.sin(angle) * 0.29,
        0.03,
        PALETTE.seatLeg,
        false
      )
    }
    sketch.rect(x - 0.23, z - 0.19, x + 0.23, z + 0.24, PALETTE.seat, 0.11)
    sketch.rect(x - 0.15, z - 0.1, x + 0.15, z + 0.14, shade(PALETTE.seat, 1.08), 0.08, false)
    sketch.rect(x - 0.29, z - 0.13, x - 0.21, z + 0.13, PALETTE.seatDark, 0.04)
    sketch.rect(x + 0.21, z - 0.13, x + 0.29, z + 0.13, PALETTE.seatDark, 0.04)
    sketch.rect(x - 0.26, z - 0.32, x + 0.26, z - 0.17, PALETTE.seatDark, 0.07)
  })
  sketch.shadowCircle(x, z, 0.3)
}

/** A desk centred at local z = offsetZ: monitor at the back, keyboard, mouse, a mug. */
type DeskOptions = { color: string; offsetZ: number; isOn: boolean }

const desk = (sketch: Sketch, { color, offsetZ, isOn }: DeskOptions) => {
  sketch.rect(-0.8, offsetZ - 0.45, 0.8, offsetZ + 0.45, color, 0.05)
  sketch.rect(-0.76, offsetZ - 0.41, 0.76, offsetZ - 0.36, shade(color, 1.08), 0.02, false)
  // Monitor: stand, body and (when someone's in) its glow.
  sketch.rect(-0.07, offsetZ - 0.33, 0.07, offsetZ - 0.2, DARK, 0.03)
  sketch.rect(-0.34, offsetZ - 0.36, 0.34, offsetZ - 0.28, DARK, 0.03)
  sketch.line(-0.3, offsetZ - 0.27, 0.3, offsetZ - 0.27, isOn ? ACCENT : "#4a5163", 0.018)
  // Keyboard, mouse, mug and a notepad.
  sketch.rect(-0.24, offsetZ + 0.04, 0.2, offsetZ + 0.19, "#d8dbe2", 0.025)
  sketch.ellipse(0.3, offsetZ + 0.12, 0.035, 0.05, "#d8dbe2")
  sketch.circle(-0.6, offsetZ - 0.16, 0.055, "#d98a63")
  sketch.ring(-0.6, offsetZ - 0.16, 0.035, shade("#d98a63", 0.7), 0.012)
  sketch.rect(0.45, offsetZ - 0.05, 0.68, offsetZ + 0.24, PAPER, 0.015)
  sketch.shadowRect(-0.8, offsetZ - 0.45, 0.8, offsetZ + 0.45)
}

/** A sofa or armchair `halfWidth` wide (each side): back, arms, seat cushions, pillows. */
type CouchOptions = { color: string; halfWidth: number; seats: number }

const couch = (sketch: Sketch, { color, halfWidth, seats }: CouchOptions) => {
  const back = shade(color, 0.86)
  const arm = shade(color, 0.92)
  sketch.rect(-halfWidth, -0.43, halfWidth, 0.43, color, 0.1)
  sketch.rect(-halfWidth, -0.43, halfWidth, -0.2, back, 0.09)
  sketch.rect(-halfWidth, -0.43, -halfWidth + 0.17, 0.43, arm, 0.08)
  sketch.rect(halfWidth - 0.17, -0.43, halfWidth, 0.43, arm, 0.08)
  const inner = halfWidth - 0.17
  const width = (inner * 2) / seats
  for (let i = 0; i < seats; i++) {
    const minX = -inner + i * width
    sketch.rect(minX + 0.015, -0.19, minX + width - 0.015, 0.4, shade(color, 1.07), 0.06)
  }
  sketch.rect(-inner + 0.06, -0.24, -inner + 0.3, -0.04, "#e8c07a", 0.05)
  if (seats > 1) sketch.rect(inner - 0.3, -0.24, inner - 0.06, -0.04, "#f3e4d0", 0.05)

  sketch.shadowRect(-halfWidth, -0.43, halfWidth, 0.43, 0.1)
}

/** A plate with some food on it at (x, z). */
type PlateOptions = { x: number; z: number; food?: string }

const plate = (sketch: Sketch, { x, z, food = "#e9a35a" }: PlateOptions) => {
  sketch.circle(x, z, 0.11, CERAMIC)
  sketch.circle(x, z, 0.06, food, false)
}

/** A potted plant: leaves fanning from the centre over a round pot. */
type PlantOptions = { x: number; z: number; radius: number; leaf: string }

const plant = (sketch: Sketch, { x, z, radius, leaf }: PlantOptions) => {
  sketch.circle(x, z, radius * 0.62, PALETTE.pot)
  const count = 7
  for (let i = 0; i < count; i++) {
    const degrees = (i / count) * 360 + 15
    const angle = (degrees * Math.PI) / 180
    sketch.ellipse(
      x + Math.cos(angle) * radius * 0.5,
      z + Math.sin(angle) * radius * 0.5,
      radius * 0.2,
      radius * 0.52,
      i % 2 ? leaf : PALETTE.plantLeafDark,
      degrees + 90
    )
  }
  sketch.circle(x, z, radius * 0.22, shade(leaf, 1.12), false)
  sketch.shadowCircle(x, z, radius)
}

export const FURNITURE_SYMBOLS: Partial<Record<ObjectType, DrawSymbol | null>> = {
  desk: ({ sketch, color, isOn }) => {
    desk(sketch, { color, offsetZ: 0, isOn })

    return sketch.done(0.8)
  },
  // The chair first: tucked in, its front slides under the desk top.
  workstation: ({ sketch, color, isOn, state }) => {
    chair(sketch, {
      x: 0,
      z: state.occupied ? WORKSTATION_SEAT_Z : 0.12,
      isFacingBack: true,
    })
    desk(sketch, { color, offsetZ: -0.25, isOn })

    return sketch.done(1)
  },
  deskmate: ({ sketch, color, isOn }) => {
    chair(sketch, { x: 0, z: DESKMATE_SEAT_Z, isFacingBack: true })
    desk(sketch, { color, offsetZ: -0.35, isOn })

    return sketch.done(1)
  },
  seat: ({ sketch }) => {
    chair(sketch, { x: 0, z: 0 })

    return sketch.done(1)
  },
  barStool: ({ sketch, color }) => {
    sketch.ring(0, 0, 0.21, PALETTE.seatLeg, 0.025)
    sketch.circle(0, 0, 0.17, color)
    sketch.circle(0, 0, 0.11, shade(color, 1.08), false)
    sketch.shadowCircle(0, 0, 0.21)

    return sketch.done(0.8)
  },
  sofa: ({ sketch, color }) => {
    couch(sketch, { color, halfWidth: 1, seats: 2 })

    return sketch.done(0.9)
  },
  armchair: ({ sketch, color }) => {
    couch(sketch, { color, halfWidth: 0.46, seats: 1 })

    return sketch.done(0.9)
  },
  coffeeTable: ({ sketch, color }) => {
    sketch.rect(-0.6, -0.3, 0.6, 0.3, color, 0.05)
    sketch.rect(-0.45, -0.18, -0.15, 0.04, "#6d90c9", 0.015)
    sketch.rect(-0.42, -0.14, -0.12, 0.08, "#e8c07a", 0.015)
    sketch.circle(0.32, 0.05, 0.06, CERAMIC)
    sketch.ring(0.32, 0.05, 0.04, shade(CERAMIC, 0.75), 0.012)
    sketch.shadowRect(-0.6, -0.3, 0.6, 0.3)

    return sketch.done(0.4)
  },
  meetingTable: ({ sketch, color }) => {
    sketch.rect(-1.8, -0.75, 1.8, 0.75, color, 0.12)
    sketch.rect(-1.7, -0.65, 1.7, 0.65, shade(color, 1.05), 0.08, false)
    for (const [x, z, turn] of [
      [-1.1, -0.42, 0],
      [0.3, -0.42, 0],
      [-0.5, 0.42, 180],
      [0.9, 0.42, 180],
    ]) {
      sketch.turned(x, z, turn, () => {
        sketch.rect(x - 0.17, z - 0.12, x + 0.17, z + 0.12, "#c9ccd3", 0.02)
        sketch.line(x - 0.15, z - 0.1, x + 0.15, z - 0.1, DARK, 0.02)
      })
    }
    sketch.circle(1.4, 0, 0.07, WATER)
    sketch.circle(-1.45, 0.1, 0.06, CERAMIC)
    plant(sketch, { x: 0, z: 0, radius: 0.16, leaf: PALETTE.plantLeaf })
    sketch.shadowRect(-1.8, -0.75, 1.8, 0.75, 0.12)

    return sketch.done(0.8)
  },
  ovalTable: ({ sketch, color }) => {
    sketch.rect(-1.35, -0.62, 1.35, 0.62, color, 0.62)
    sketch.rect(-1.2, -0.48, 1.2, 0.48, shade(color, 1.05), 0.48, false)
    sketch.rect(-0.7, -0.2, -0.38, 0.16, PAPER, 0.02)
    sketch.rect(0.42, -0.14, 0.74, 0.2, PAPER, 0.02)
    sketch.circle(0, 0, 0.08, WATER)
    sketch.shadowRect(-1.35, -0.62, 1.35, 0.62, 0.62)

    return sketch.done(0.8)
  },
  roundTable: ({ sketch, color }) => {
    sketch.circle(0, 0, 0.66, color)
    sketch.circle(0, 0, 0.56, shade(color, 1.05), false)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      plate(sketch, {
        x: Math.cos(angle) * 0.4,
        z: Math.sin(angle) * 0.4,
        food: i % 2 ? "#7fa66a" : "#e9a35a",
      })
    }
    sketch.circle(0, 0, 0.1, "#c9564f")
    sketch.shadowCircle(0, 0, 0.66)

    return sketch.done(0.8)
  },
  squareTable: ({ sketch, color }) => {
    sketch.rect(-0.4, -0.4, 0.4, 0.4, color, 0.05)
    plate(sketch, { x: -0.14, z: 0.12 })
    sketch.circle(0.17, -0.15, 0.055, CERAMIC)
    sketch.shadowRect(-0.4, -0.4, 0.4, 0.4)

    return sketch.done(0.8)
  },
  barTable: ({ sketch, color }) => {
    sketch.circle(0, 0, 0.42, color)
    sketch.circle(0, 0, 0.34, shade(color, 1.05), false)
    sketch.circle(0.1, -0.08, 0.055, CERAMIC)
    sketch.shadowCircle(0, 0, 0.42)

    return sketch.done(1.1)
  },
  ovalBarTable: ({ sketch, color }) => {
    sketch.rect(-0.9, -0.38, 0.9, 0.38, color, 0.38)
    sketch.rect(-0.78, -0.27, 0.78, 0.27, shade(color, 1.05), 0.27, false)
    sketch.circle(-0.3, 0, 0.055, CERAMIC)
    sketch.circle(0.35, 0.05, 0.055, WATER)
    sketch.shadowRect(-0.9, -0.38, 0.9, 0.38, 0.38)

    return sketch.done(1.1)
  },
  plant: ({ sketch, color }) => {
    plant(sketch, { x: 0, z: 0, radius: 0.3, leaf: color })

    return sketch.done(0.9)
  },
  planterBox: ({ sketch, color }) => {
    sketch.rect(-0.95, -0.21, 0.95, 0.21, color, 0.04)
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) {
      sketch.circle(x, 0, 0.17, PALETTE.plantLeafDark, false)
      sketch.circle(x - 0.03, -0.03, 0.12, PALETTE.plantLeaf, false)
    }
    sketch.shadowRect(-0.95, -0.21, 0.95, 0.21)

    return sketch.done(0.8)
  },
  floorLamp: ({ sketch, color }) => {
    sketch.circle(0, 0, 0.3, "#fff2c4", false)
    sketch.circle(0, 0, 0.17, color)
    sketch.circle(0, 0, 0.07, "#fffaf0", false)
    sketch.shadowCircle(0, 0, 0.17)

    return sketch.done(1.4)
  },
  trashBin: ({ sketch, color }) => {
    sketch.circle(0, 0, 0.16, color)
    sketch.circle(0, 0, 0.12, shade(color, 0.7), false)
    sketch.shadowCircle(0, 0, 0.16)

    return sketch.done(0.4)
  },
  coatRack: ({ sketch, color }) => {
    sketch.circle(0, 0, 0.14, color)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      sketch.line(0, 0, Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, shade(color, 0.7), 0.02)
    }
    sketch.ellipse(0.06, 0.1, 0.14, 0.08, PALETTE.seatDark, 20)
    sketch.ellipse(-0.08, -0.08, 0.12, 0.07, "#b96f6f", -30)
    sketch.circle(0, 0, 0.035, shade(color, 0.6), false)
    sketch.shadowCircle(0, 0, 0.16)

    return sketch.done(1.5)
  },
  rug: ({ sketch, color, halfX, halfZ }) => {
    const minX = -halfX + 0.05
    const minZ = -halfZ + 0.05
    sketch.rect(minX, minZ, -minX, -minZ, color, 0.04, false)
    sketch.rect(
      minX + 0.12,
      minZ + 0.12,
      -minX - 0.12,
      -minZ - 0.12,
      shade(color, 1.1),
      0.03,
      false
    )
    sketch.rect(minX + 0.22, minZ + 0.22, -minX - 0.22, -minZ - 0.22, color, 0.03, false)
    for (let x = minX + 0.08; x < -minX - 0.04; x += 0.12) {
      sketch.line(x, minZ - 0.04, x, minZ, shade(color, 0.85), 0.015)
      sketch.line(x, -minZ, x, -minZ + 0.04, shade(color, 0.85), 0.015)
    }

    return sketch.done(0.01)
  },
  tvScreen: ({ sketch }) => {
    sketch.rect(-0.6, -0.2, -0.45, 0.2, DARK, 0.03)
    sketch.rect(0.45, -0.2, 0.6, 0.2, DARK, 0.03)
    sketch.rect(-0.7, -0.05, 0.7, 0.04, DARK, 0.02)
    sketch.line(-0.66, 0.05, 0.66, 0.05, ACCENT, 0.015)
    sketch.shadowRect(-0.7, -0.2, 0.7, 0.2, 0.04)

    return sketch.done(1.6)
  },
  whiteboard: ({ sketch }) => {
    sketch.rect(-0.6, -0.2, -0.5, 0.2, "#8f9aa6", 0.03)
    sketch.rect(0.5, -0.2, 0.6, 0.2, "#8f9aa6", 0.03)
    sketch.rect(-0.7, -0.05, 0.7, 0.05, "#f6f7f8", 0.02)
    for (const [x, markerColor] of [
      [-0.2, "#c9564f"],
      [-0.1, "#4a6fae"],
      [0, "#3d6b33"],
    ] as const)
      sketch.circle(x, 0.08, 0.018, markerColor, false)
    sketch.shadowRect(-0.7, -0.2, 0.7, 0.2, 0.04)

    return sketch.done(1.6)
  },
  divider: ({ sketch, color, halfX }) => {
    sketch.rect(-halfX + 0.08, -0.15, -halfX + 0.2, 0.15, DARK, 0.03)
    sketch.rect(halfX - 0.2, -0.15, halfX - 0.08, 0.15, DARK, 0.03)
    sketch.rect(-halfX + 0.05, -0.05, halfX - 0.05, 0.05, color, 0.04)
    sketch.shadowRect(-halfX + 0.05, -0.15, halfX - 0.05, 0.15, 0.04)

    return sketch.done(1.3)
  },
  toilet: ({ sketch, color }) => {
    sketch.rect(-0.2, -0.5, 0.2, -0.32, color, 0.05)
    sketch.ellipse(0, -0.06, 0.19, 0.26, color)
    sketch.ellipse(0, -0.03, 0.12, 0.17, WATER)
    sketch.circle(0, -0.41, 0.025, STEEL, false)
    sketch.shadowRect(-0.2, -0.5, 0.2, 0.2, 0.18)

    return sketch.done(0.8)
  },
  shower: ({ sketch, color }) => {
    sketch.rect(-0.48, -0.48, 0.48, 0.48, CERAMIC, 0.03)
    sketch.rect(-0.48, -0.48, 0.48, -0.43, color, 0.01)
    sketch.rect(-0.48, -0.43, -0.43, 0.48, color, 0.01)
    for (const offset of [-0.2, 0.05, 0.3]) {
      sketch.line(offset, -0.48, offset, -0.43, shade(color, 0.8), 0.008)
      sketch.line(-0.48, offset, -0.43, offset, shade(color, 0.8), 0.008)
    }
    sketch.line(-0.38, -0.38, 0.4, 0.4, shade(CERAMIC, 0.85), 0.012)
    sketch.line(-0.38, 0.4, 0.4, -0.38, shade(CERAMIC, 0.85), 0.012)
    sketch.circle(0, 0, 0.04, STEEL)
    sketch.circle(0, -0.28, 0.09, STEEL)
    sketch.line(-0.43, 0.46, 0.48, 0.46, GLASS, 0.03)
    sketch.line(0.46, -0.43, 0.46, 0.48, GLASS, 0.03)
    sketch.shadowRect(-0.48, -0.48, 0.48, 0.48, 0.03)

    return sketch.done(1.5)
  },
  bathroomSink: ({ sketch, color }) => {
    sketch.rect(-0.45, -0.22, 0.45, 0.22, color, 0.04)
    sketch.ellipse(0, 0.02, 0.27, 0.15, CERAMIC)
    sketch.ellipse(0, 0.03, 0.2, 0.1, "#e4e1da", 0, false)
    sketch.circle(0, 0.03, 0.02, STEEL, false)
    sketch.rect(-0.03, -0.18, 0.03, -0.08, STEEL, 0.01)
    sketch.shadowRect(-0.45, -0.22, 0.45, 0.22)

    return sketch.done(0.9)
  },
  bookshelf: ({ sketch, color }) => {
    sketch.rect(-0.6, -0.18, 0.6, 0.18, color, 0.03)
    sketch.rect(-0.55, -0.13, 0.55, 0.13, shade(color, 0.75), 0.02, false)
    let x = -0.53
    let i = 0
    while (x < 0.5) {
      const width = 0.05 + ((i * 37) % 5) * 0.012
      sketch.rect(x, -0.11, Math.min(0.53, x + width), 0.11, BOOKS[i % BOOKS.length], 0.01, false)
      x += width + 0.008
      i++
    }
    sketch.shadowRect(-0.6, -0.18, 0.6, 0.18, 0.03)

    return sketch.done(1.5)
  },
  shelvingUnit: ({ sketch, color }) => {
    sketch.rect(-0.6, -0.18, 0.6, 0.18, color, 0.03)
    for (const [minX, maxX, shelfColor] of [
      [-0.52, -0.22, "#c9a27e"],
      [-0.16, 0.12, "#b9c7d6"],
      [0.18, 0.5, "#c9a27e"],
    ] as const)
      sketch.rect(minX, -0.12, maxX, 0.12, shelfColor, 0.02)
    sketch.shadowRect(-0.6, -0.18, 0.6, 0.18, 0.03)

    return sketch.done(1.7)
  },
  filingCabinet: ({ sketch, color }) => {
    sketch.rect(-0.22, -0.22, 0.22, 0.22, color, 0.03)
    sketch.rect(-0.18, -0.18, 0.18, 0.12, shade(color, 1.06), 0.02, false)
    sketch.line(-0.08, 0.17, 0.08, 0.17, shade(color, 0.6), 0.025)
    sketch.shadowRect(-0.22, -0.22, 0.22, 0.22, 0.03)

    return sketch.done(0.9)
  },
  lockers: ({ sketch, color }) => {
    const count = 4
    const width = 1.44 / count
    sketch.rect(-0.72, -0.22, 0.72, 0.22, color, 0.03)
    for (let i = 1; i < count; i++)
      sketch.line(-0.72 + i * width, -0.22, -0.72 + i * width, 0.22, shade(color, 0.75), 0.015)
    for (let i = 0; i < count; i++)
      sketch.circle(-0.72 + (i + 0.75) * width, 0.17, 0.02, STEEL, false)
    sketch.shadowRect(-0.72, -0.22, 0.72, 0.22, 0.03)

    return sketch.done(1.7)
  },
  wardrobe: ({ sketch, color }) => {
    sketch.rect(-0.7, -0.45, 0.7, 0.45, color, 0.04)
    sketch.rect(-0.64, -0.39, 0.64, 0.35, shade(color, 1.06), 0.03, false)
    sketch.line(0, -0.4, 0, 0.45, shade(color, 0.7), 0.015)
    sketch.line(-0.1, 0.4, -0.04, 0.4, shade(color, 0.5), 0.025)
    sketch.line(0.04, 0.4, 0.1, 0.4, shade(color, 0.5), 0.025)
    sketch.shadowRect(-0.7, -0.45, 0.7, 0.45, 0.04)

    return sketch.done(1.75)
  },
  printer: ({ sketch, color }) => {
    sketch.rect(-0.4, -0.35, 0.4, 0.33, color, 0.05)
    sketch.rect(-0.3, -0.25, 0.3, 0.05, shade(color, 0.85), 0.03)
    sketch.rect(-0.22, -0.2, 0.22, 0.02, PAPER, 0.01, false)
    sketch.rect(-0.38, 0.18, -0.08, 0.3, DARK, 0.02)
    sketch.circle(-0.3, 0.24, 0.015, "#6ee7a0", false)
    sketch.rect(-0.25, 0.33, 0.25, 0.44, PAPER, 0.01)
    sketch.shadowRect(-0.4, -0.35, 0.4, 0.44, 0.05)

    return sketch.done(0.9)
  },
  vendingMachine: ({ sketch, color }) => {
    sketch.rect(-0.45, -0.4, 0.45, 0.4, color, 0.04)
    sketch.rect(-0.38, -0.3, 0.38, 0.06, shade(color, 1.1), 0.03, false)
    sketch.rect(-0.4, 0.24, 0.12, 0.38, DARK, 0.02)
    for (let i = 0; i < 4; i++) sketch.circle(-0.33 + i * 0.13, 0.31, 0.03, BOOKS[i], false)
    sketch.rect(0.2, 0.22, 0.38, 0.38, "#e8e2d6", 0.02)
    sketch.shadowRect(-0.45, -0.4, 0.45, 0.4, 0.04)

    return sketch.done(1.8)
  },
  kitchenCounter: ({ sketch, color }) => {
    sketch.rect(-1, -0.45, 1, 0.45, color, 0.04)
    sketch.rect(-1, 0.38, 1, 0.45, shade(color, 0.85), 0.02, false)
    // A sink with its tap, and a hob.
    sketch.rect(-0.8, -0.3, -0.25, 0.22, STEEL, 0.06)
    sketch.rect(-0.74, -0.24, -0.31, 0.16, shade(STEEL, 0.85), 0.05, false)
    sketch.rect(-0.55, -0.42, -0.5, -0.3, shade(STEEL, 0.7), 0.01)
    sketch.rect(0.1, -0.32, 0.8, 0.28, DARK, 0.05)
    for (const [x, z] of [
      [0.28, -0.14],
      [0.62, -0.14],
      [0.28, 0.12],
      [0.62, 0.12],
    ])
      sketch.ring(x, z, 0.1, "#5c6475", 0.025)
    sketch.shadowRect(-1, -0.45, 1, 0.45, 0.04)

    return sketch.done(0.9)
  },
  fridge: ({ sketch, color }) => {
    sketch.rect(-0.38, -0.38, 0.38, 0.38, color, 0.06)
    sketch.rect(-0.32, -0.32, 0.32, 0.28, shade(color, 1.04), 0.04, false)
    sketch.line(-0.38, 0.12, 0.38, 0.12, shade(color, 0.78), 0.015)
    sketch.line(0.25, 0.2, 0.25, 0.34, shade(color, 0.55), 0.03)
    sketch.shadowRect(-0.38, -0.38, 0.38, 0.38, 0.06)

    return sketch.done(1.8)
  },
  cooler: ({ sketch, color }) => {
    sketch.rect(-0.2, -0.2, 0.2, 0.2, color, 0.04)
    sketch.circle(0, -0.02, 0.15, "#9fd0ea")
    sketch.circle(0, -0.02, 0.07, "#cfe9f6", false)
    sketch.circle(0, -0.02, 0.035, "#4a6fae", false)
    sketch.shadowRect(-0.2, -0.2, 0.2, 0.2, 0.04)

    return sketch.done(1.1)
  },
  serverRack: ({ sketch, color }) => {
    sketch.rect(-0.31, -0.45, 0.31, 0.45, color, 0.03)
    for (let i = 0; i < 6; i++)
      sketch.line(-0.24, -0.35 + i * 0.12, 0.24, -0.35 + i * 0.12, shade(color, 1.5), 0.012)
    for (let i = 0; i < 4; i++)
      sketch.circle(-0.18 + i * 0.1, 0.4, 0.015, i % 3 ? "#6ee7a0" : ACCENT, false)
    sketch.shadowRect(-0.31, -0.45, 0.31, 0.45, 0.03)

    return sketch.done(1.9)
  },
  wallTv: ({ sketch }) => {
    sketch.rect(-0.65, -0.21, 0.65, -0.14, DARK, 0.02)
    sketch.line(-0.6, -0.13, 0.6, -0.13, ACCENT, 0.012)

    return sketch.done(1.2)
  },
  wallArt: ({ sketch, color }) => {
    sketch.rect(-0.36, -0.21, 0.36, -0.14, color, 0.015)
    sketch.line(-0.3, -0.13, 0.3, -0.13, "#9fc3c9", 0.012)

    return sketch.done(1.1)
  },
  wallClock: ({ sketch, color }) => {
    sketch.rect(-0.17, -0.21, 0.17, -0.14, color, 0.03)

    return sketch.done(1.2)
  },
  wallShelf: ({ sketch, color }) => {
    sketch.rect(-0.45, -0.21, 0.45, 0.02, color, 0.02)
    sketch.circle(-0.25, -0.08, 0.06, PALETTE.plantLeaf, false)
    sketch.rect(0.05, -0.15, 0.3, -0.04, "#6d90c9", 0.01)

    return sketch.done(0.9)
  },
  ceilingLight: null,
}
