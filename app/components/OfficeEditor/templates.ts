import { wallRun } from "./layout"
import type { ObjectType, SceneObject } from "./types"

const HALF = Math.PI / 2

let seq = 0
const oid = () => `tpl-${(seq++).toString(36)}`

const make = (type: ObjectType, x: number, z: number, rotation = 0): SceneObject => ({
  id: oid(),
  type,
  x,
  z,
  rotation,
})

/** Wall half-segments along a straight line between two grid nodes. */
const line = (x0: number, z0: number, x1: number, z1: number): SceneObject[] =>
  wallRun({ x: x0, z: z0 }, { x: x1, z: z1 }).map((e) => make("wall", e.x, e.z, e.rotation))

/** Wall half-segments around the rectangle spanning grid nodes (x0,z0)-(x1,z1). */
const roomWalls = (x0: number, z0: number, x1: number, z1: number): SceneObject[] => [
  ...line(x0, z0, x1, z0),
  ...line(x0, z1, x1, z1),
  ...line(x0, z0, x0, z1),
  ...line(x1, z0, x1, z1),
]

/**
 * Cut an opening (door or window, 1 unit = two wall halves) into a wall,
 * centred at (x, z): the two halves it covers are replaced by it.
 * `vertical` = a wall running along Z.
 */
const withOpening = (
  kind: "door" | "window",
  walls: SceneObject[],
  x: number,
  z: number,
  vertical = false
): SceneObject[] => [
  ...walls.filter((w) =>
    vertical
      ? !(w.rotation === HALF && w.x === x && Math.abs(w.z - z) < 0.5)
      : !(w.rotation === 0 && w.z === z && Math.abs(w.x - x) < 0.5)
  ),
  make(kind, x, z, vertical ? HALF : 0),
]

/** Cut several openings in turn: [kind, x, z, vertical?][] */
const withOpenings = (
  walls: SceneObject[],
  openings: ["door" | "window", number, number, boolean?][]
): SceneObject[] =>
  openings.reduce((acc, [kind, x, z, vertical]) => withOpening(kind, acc, x, z, vertical), walls)

/** A desk with a chair tucked in front of it (facing +Z). */
const workstation = (x: number, z: number): SceneObject[] => [
  make("desk", x, z, 0),
  make("seat", x, z + 1, 0),
]

export interface OfficeTemplate {
  id: string
  label: string
  /** One-line summary (shown for the featured template). */
  description?: string
  /** Builds a fresh scene each time so ids never collide across loads. */
  build: () => SceneObject[]
}

/** Facing helpers: every object's front is +Z at rotation 0. */
const FACE_S = 0 // front toward +Z
const FACE_N = Math.PI // front toward −Z
const FACE_E = HALF // front toward +X
const FACE_W = -HALF // front toward −X

export const TEMPLATES: OfficeTemplate[] = [
  {
    id: "full-office",
    label: "Full office",
    description: "Desks, meeting room, kitchen & lounge",
    build: () => {
      seq = 0
      // 16 × 11 shell with the entrance on the south wall. A meeting room sits in
      // the north-east corner (partition at x = 11 and z = 5.5, door on the
      // south side); the kitchen corner and lounge are open-plan.
      // Windows go where nothing tall stands against the wall.
      const walls = [
        ...withOpenings(roomWalls(0, 0, 16, 11), [
          ["door", 7.5, 11],
          ["window", 7.5, 0], // workspace, north
          ["window", 12.5, 0], // meeting room, north
          ["window", 14.5, 0],
          ["window", 0, 2.5, true], // workspace, west
          ["window", 0, 4.5, true],
          ["window", 0, 10, true], // lounge, west
          ["window", 16, 1, true], // meeting room, east
          ["window", 16, 4.5, true],
          ["window", 16, 9.5, true], // kitchen, east
          ["window", 2, 11], // lounge, south
          ["window", 4.5, 11],
        ]),
        ...line(11, 0, 11, 5.5),
        ...withOpening("door", line(11, 5.5, 16, 5.5), 13.5, 5.5),
      ]

      // Open workspace: two desk pods (desks meet in the middle, chairs out).
      const desks = [1.5, 3.5, 5.5, 7.5].flatMap((x) => [
        make("workstation", x, 2.25, FACE_N),
        make("workstation", x, 3.75, FACE_S),
      ])

      return [
        ...walls,
        ...desks,

        // Storage + printing along the north wall.
        make("lockers", 1.25, 0.25),
        make("lockers", 2.75, 0.25),
        make("bookshelf", 4.75, 0.25),
        make("bookshelf", 6.25, 0.25),
        make("trashBin", 9.25, 0.25),
        make("printer", 10, 0.5),
        make("filingCabinet", 10.75, 0.25),
        make("floorLamp", 8.75, 1.25),
        make("whiteboard", 9.75, 2.75, FACE_W),
        make("plant", 0.25, 5.75),
        make("plant", 9.25, 5.25),

        // Meeting room: table for six, a display on the east wall.
        make("meetingTable", 13.5, 2.5),
        ...[12.5, 13.5, 14.5].flatMap((x) => [
          make("seat", x, 1, FACE_S),
          make("seat", x, 4, FACE_N),
        ]),
        make("tvScreen", 15.75, 2.75, FACE_W),
        make("plant", 11.25, 0.25),
        make("plant", 15.75, 0.25),
        make("floorLamp", 15.75, 5.25),

        // Kitchen corner: counters, fridge, a small table, drinks.
        make("kitchenCounter", 15.5, 7, FACE_W),
        make("fridge", 15.5, 8.5, FACE_W),
        make("kitchenCounter", 14, 10.5, FACE_N),
        make("trashBin", 15.75, 10.75),
        make("vendingMachine", 12, 10.5, FACE_N),
        make("cooler", 11.25, 10.75),
        make("coffeeTable", 12.75, 7.5),
        make("seat", 11.5, 7.5, FACE_E),
        make("seat", 12.5, 6.5, FACE_S),
        make("seat", 13, 8.5, FACE_N),
        make("floorLamp", 11.25, 5.75),

        // Lounge: rug, two sofas around a coffee table, reading corner.
        make("rug", 3, 8.5),
        make("sofa", 3, 7, FACE_S),
        make("sofa", 3, 10, FACE_N),
        make("coffeeTable", 3.25, 8.5),
        make("bookshelf", 0.25, 8.25, FACE_E),
        make("floorLamp", 1.25, 6.75),
        make("floorLamp", 4.75, 10.25),
        make("plant", 0.25, 10.75),
        make("plant", 6.75, 10.75),
        make("plant", 8.25, 10.75),
      ]
    },
  },
  {
    id: "open-plan",
    label: "Open plan",
    build: () => {
      seq = 0
      // Entrance door on the bottom edge, windows on the other three sides.
      const walls = withOpenings(roomWalls(0, 0, 10, 7), [
        ["door", 4.5, 7],
        ["window", 2, 0],
        ["window", 5, 0],
        ["window", 8, 0],
        ["window", 0, 3.5, true],
        ["window", 10, 3.5, true],
      ])
      return [
        ...walls,
        ...workstation(2, 1),
        ...workstation(4, 1),
        ...workstation(6, 1),
        ...workstation(2, 4),
        ...workstation(4, 4),
        ...workstation(6, 4),
        make("plant", 8.5, 1),
        make("plant", 8.5, 5),
        make("cooler", 1, 5.5),
      ]
    },
  },
  {
    id: "meeting-rooms",
    label: "Meeting rooms",
    build: () => {
      seq = 0
      // Entrance door on the bottom edge, plus an interior partition at x = 5
      // with a 1-unit doorway gap (z 3–4).
      const walls = [
        ...withOpenings(roomWalls(0, 0, 12, 7), [
          ["door", 8.5, 7],
          ["window", 8.5, 0],
          ["window", 10.5, 0],
          ["window", 0, 3.5, true],
          ["window", 12, 2.5, true],
        ]),
        ...line(5, 0, 5, 3),
        ...line(5, 4, 5, 7),
      ]
      return [
        ...walls,
        make("meetingTable", 2.5, 3, 0),
        make("seat", 1.5, 3, HALF),
        make("seat", 3.5, 3, -HALF),
        make("meetingTable", 8.5, 3, 0),
        make("seat", 7.5, 3, HALF),
        make("seat", 9.5, 3, -HALF),
        make("whiteboard", 2.5, 0.4, 0),
        make("plant", 11, 6),
      ]
    },
  },
]
