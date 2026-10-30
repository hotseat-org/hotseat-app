import { wallRun } from "./layout"
import type { ObjectType, SceneObject } from "./types"
import { msg } from "~/i18n/msg"

const HALF = Math.PI / 2

let sequence = 0
const createId = () => `tpl-${(sequence++).toString(36)}`

const make = (type: ObjectType, x: number, z: number, rotation = 0): SceneObject => ({
  id: createId(),
  type,
  x,
  z,
  rotation,
})

/** Wall half-segments along a straight line between two grid nodes. */
const line = (x0: number, z0: number, x1: number, z1: number): SceneObject[] =>
  wallRun({ x: x0, z: z0 }, { x: x1, z: z1 }).map((placement) =>
    make("wall", placement.x, placement.z, placement.rotation)
  )

/** The same, as glass (meeting rooms and booths you can see into). */
const glassLine = (x0: number, z0: number, x1: number, z1: number): SceneObject[] =>
  wallRun({ x: x0, z: z0 }, { x: x1, z: z1 }).map((placement) =>
    make("glassWall", placement.x, placement.z, placement.rotation)
  )

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
type OpeningKind = "door" | "window" | "glassDoor"

const withOpening = (
  kind: OpeningKind,
  walls: SceneObject[],
  x: number,
  z: number,
  vertical = false
): SceneObject[] => [
  ...walls.filter((wall) =>
    vertical
      ? !(wall.rotation === HALF && wall.x === x && Math.abs(wall.z - z) < 0.5)
      : !(wall.rotation === 0 && wall.z === z && Math.abs(wall.x - x) < 0.5)
  ),
  make(kind, x, z, vertical ? HALF : 0),
]

/**
 * Cut several openings in turn: [kind, x, z, vertical?][]. Walls drawn twice
 * (a partition ending on an outer wall) are kept once.
 */
const withOpenings = (
  walls: SceneObject[],
  openings: [OpeningKind, number, number, boolean?][]
): SceneObject[] => {
  const seen = new Set<string>()
  const unique = walls.filter((wall) => {
    const key = `${wall.x},${wall.z},${wall.rotation}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return openings.reduce(
    (current, [kind, x, z, vertical]) => withOpening(kind, current, x, z, vertical),
    unique
  )
}

/**
 * A bookable desk, its chair in front (facing +Z), the desk itself at (x, z):
 * a workstation's desk sits 0.25 m back from its centre.
 */
const deskWithChair = (x: number, z: number): SceneObject[] => [make("workstation", x, z + 0.25, 0)]

/**
 * A desk pod: `pairs` workstations side by side (2 m apart, from `x`), each
 * facing one across the middle — the north row at `z`, the south row 1.5 m on.
 */
const pod = (x: number, z: number, pairs: number): SceneObject[] =>
  Array.from({ length: pairs }, (_, i) => [
    make("workstation", x + i * 2, z, FACE_N),
    make("workstation", x + i * 2, z + 1.5, FACE_S),
  ]).flat()

/**
 * Restroom stalls in a row against a wall: each 1.5 m wide and deep, a toilet
 * at the back, its door in the front partition. `back` is the wall's z, and
 * `dir` which way the stalls open (−1: the wall is to the south, doors north).
 * Returns the partitions (walls) and the toilets; doors are cut by the caller.
 */
const stalls = (x: number, back: number, count: number, direction: 1 | -1) => {
  const front = back + direction * 1.5
  const walls = [
    ...line(x, front, x + count * 1.5, front),
    ...Array.from({ length: count + 1 }, (_, i) => i)
      .filter((i) => i > 0)
      .flatMap((i) => line(x + i * 1.5, Math.min(back, front), x + i * 1.5, Math.max(back, front))),
  ]
  const toilets = Array.from({ length: count }, (_, i) =>
    make("toilet", x + i * 1.5 + 0.75, back + direction * 0.5, direction > 0 ? FACE_S : FACE_N)
  )
  const doors: [OpeningKind, number, number][] = Array.from({ length: count }, (_, i) => [
    "door",
    x + i * 1.5 + 0.5,
    front,
  ])
  return { walls, toilets, doors }
}

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
    label: msg("Full office"),
    description: msg("Desks, meeting room, kitchen & lounge"),
    build: () => {
      sequence = 0
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
    label: msg("Open plan"),
    build: () => {
      sequence = 0
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
        ...deskWithChair(2, 1),
        ...deskWithChair(4, 1),
        ...deskWithChair(6, 1),
        ...deskWithChair(2, 4),
        ...deskWithChair(4, 4),
        ...deskWithChair(6, 4),
        make("plant", 8.75, 1.25),
        make("plant", 8.75, 5.25),
        make("cooler", 1.25, 5.75),
      ]
    },
  },
  {
    id: "meeting-rooms",
    label: msg("Meeting rooms"),
    build: () => {
      sequence = 0
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
        // Each table lengthwise, two chairs a side.
        make("meetingTable", 2.5, 3.5, HALF),
        ...[2.5, 4.5].flatMap((z) => [make("seat", 1, z, FACE_E), make("seat", 4, z, FACE_W)]),
        make("meetingTable", 8.5, 3.5, HALF),
        ...[2.5, 4.5].flatMap((z) => [make("seat", 7, z, FACE_E), make("seat", 10, z, FACE_W)]),
        make("whiteboard", 2.75, 0.25),
        make("plant", 11.25, 6.25),
      ]
    },
  },
  {
    id: "team-floor",
    label: msg("Team floor"),
    description: msg("24 desks, meeting & focus rooms, kitchen, restrooms"),
    build: () => {
      sequence = 0
      // 24 × 14 m. Open workspace (west); a meeting room and two focus rooms
      // (east); along the south: restrooms, a lounge by the entrance, and the
      // kitchen with a dining table.
      const restroom = stalls(0, 14, 3, -1)
      const walls = withOpenings(
        [
          ...roomWalls(0, 0, 24, 14),
          ...line(15, 0, 15, 5), // meeting room
          ...line(15, 5, 24, 5),
          ...line(15, 5, 15, 9), // focus rooms
          ...line(19.5, 5, 19.5, 9),
          ...line(15, 9, 24, 9),
          ...line(0, 10, 5, 10), // restrooms
          ...line(5, 10, 5, 14),
          ...restroom.walls,
        ],
        [
          ["door", 12, 14], // entrance
          ["door", 15, 2.5, true], // meeting room
          ["door", 17, 9], // focus rooms
          ["door", 21.5, 9],
          ["door", 5, 11, true], // restrooms
          ...restroom.doors,
          ["window", 2.5, 0],
          ["window", 5, 0],
          ["window", 7.5, 0],
          ["window", 10, 0],
          ["window", 12.5, 0],
          ["window", 18, 0],
          ["window", 21, 0],
          ["window", 0, 2.5, true],
          ["window", 0, 5, true],
          ["window", 0, 7.5, true],
          ["window", 24, 1, true],
          ["window", 24, 7, true],
          ["window", 7, 14],
          ["window", 17.5, 14],
          ["window", 20, 14],
        ]
      )
      return [
        ...walls,

        // Workspace: four pods of six.
        ...pod(2, 2.25, 3),
        ...pod(9, 2.25, 3),
        ...pod(2, 6.25, 3),
        ...pod(9, 6.25, 3),
        make("whiteboard", 14.75, 6.75, FACE_W),
        make("printer", 14, 9),
        make("lockers", 0.25, 9.25, FACE_E),
        make("plant", 0.25, 0.25),
        make("plant", 14.75, 0.25),

        // Meeting room for six, a screen at the end.
        make("meetingTable", 19.5, 2.5),
        ...[18.5, 19.5, 20.5].flatMap((x) => [
          make("seat", x, 1, FACE_S),
          make("seat", x, 4, FACE_N),
        ]),
        make("tvScreen", 23.75, 2.75, FACE_W),
        make("plant", 15.25, 0.25),
        make("plant", 23.75, 4.75),

        // Two focus rooms, a small table for three each.
        make("squareTable", 17, 7),
        make("seat", 16, 7, FACE_E),
        make("seat", 18, 7, FACE_W),
        make("seat", 17, 6, FACE_S),
        make("plant", 19.25, 5.25),
        make("squareTable", 21.5, 7),
        make("seat", 20.5, 7, FACE_E),
        make("seat", 22.5, 7, FACE_W),
        make("seat", 21.5, 6, FACE_S),
        make("plant", 23.75, 5.25),

        // Restrooms: three stalls, two sinks.
        ...restroom.toilets,
        make("bathroomSink", 1.5, 10.25),
        make("bathroomSink", 3, 10.25),
        make("trashBin", 4.75, 10.25),

        // Lounge by the entrance.
        make("planterBox", 8, 9.75),
        make("planterBox", 11, 9.75),
        make("rug", 8, 12),
        make("sofa", 8, 10.5, FACE_S),
        make("sofa", 8, 13.5, FACE_N),
        make("coffeeTable", 8.25, 12),
        make("armchair", 6, 12, FACE_E),
        make("coatRack", 11.25, 13.75),
        make("plant", 5.25, 13.75),
        make("plant", 14.75, 13.75),

        // Kitchen and dining.
        make("kitchenCounter", 23.5, 10, FACE_W),
        make("kitchenCounter", 23.5, 12, FACE_W),
        make("fridge", 23.5, 13.5, FACE_W),
        make("vendingMachine", 22, 13.5, FACE_N),
        make("cooler", 21.25, 13.75),
        make("trashBin", 22.75, 9.25),
        make("ovalTable", 19, 11.75),
        ...[18, 19, 20].flatMap((x) => [
          make("seat", x, 10.5, FACE_S),
          make("seat", x, 13, FACE_N),
        ]),
        make("plant", 15.25, 13.75),
      ]
    },
  },
  {
    id: "headquarters",
    label: msg("Headquarters"),
    description: msg("36 desks, boardroom, booths, kitchen, two restrooms"),
    build: () => {
      sequence = 0
      // 32 × 20 m. North: boardroom, two meeting rooms, phone booths and the
      // server room, off a corridor. Middle: the workspace, and the kitchen to
      // the east. South: restrooms at both ends, a lounge, and reception at
      // the entrance.
      const westRestroom = stalls(0, 20, 3, -1)
      const eastRestroom = stalls(27.5, 20, 3, -1)
      const walls = withOpenings(
        [
          ...roomWalls(0, 0, 32, 20),
          ...line(0, 6, 23, 6), // north rooms
          ...line(11, 0, 11, 6),
          ...line(17, 0, 17, 6),
          ...line(23, 0, 23, 6),
          ...line(23, 3, 29, 3), // phone booths
          ...[24.5, 26, 27.5].flatMap((x) => line(x, 0, x, 3)),
          ...line(29, 0, 29, 6), // server room
          ...line(29, 6, 32, 6),
          ...line(0, 15, 5, 15), // restrooms, west
          ...line(5, 15, 5, 20),
          ...westRestroom.walls,
          ...line(27, 15, 32, 15), // restrooms, east
          ...line(27, 15, 27, 20),
          ...eastRestroom.walls,
        ],
        [
          ["door", 18, 20], // entrance
          ["door", 9.5, 6], // boardroom
          ["door", 14, 6], // meeting rooms
          ["door", 20, 6],
          ...[23.5, 25, 26.5, 28].map((x): [OpeningKind, number, number] => ["door", x, 3]),
          ["door", 29, 4.5, true], // server room
          ["door", 5, 16, true], // restrooms
          ["door", 27, 16, true],
          ...westRestroom.doors,
          ...eastRestroom.doors,
          ["window", 3, 0],
          ["window", 8, 0],
          ["window", 14, 0],
          ["window", 20, 0],
          ["window", 0, 9, true],
          ["window", 0, 12, true],
          ["window", 32, 13, true],
          ["window", 8, 20],
          ["window", 12, 20],
          ["window", 22, 20],
          ["window", 24.5, 20],
        ]
      )
      return [
        ...walls,

        // Boardroom: two tables end to end, eighteen seats, a screen.
        make("meetingTable", 3.5, 3),
        make("meetingTable", 7.5, 3),
        ...[2, 3, 4, 5, 6, 7, 8, 9].flatMap((x) => [
          make("seat", x, 1.5, FACE_S),
          make("seat", x, 4.5, FACE_N),
        ]),
        make("seat", 1, 3, FACE_E),
        make("seat", 10, 3, FACE_W),
        make("wallTv", 10.75, 3.25, FACE_W),
        make("plant", 0.25, 0.25),
        make("plant", 10.75, 0.25),

        // Two meeting rooms for six.
        make("meetingTable", 14, 3),
        ...[13, 14, 15].flatMap((x) => [
          make("seat", x, 1.5, FACE_S),
          make("seat", x, 4.5, FACE_N),
        ]),
        make("whiteboard", 11.25, 3.25, FACE_E),
        make("meetingTable", 20, 3),
        ...[19, 20, 21].flatMap((x) => [
          make("seat", x, 1.5, FACE_S),
          make("seat", x, 4.5, FACE_N),
        ]),
        make("tvScreen", 22.75, 3.25, FACE_W),

        // Phone booths, and the server room.
        ...[23.5, 25, 26.5, 28].map((x) => make("armchair", x, 1, FACE_S)),
        make("serverRack", 30, 1, FACE_S),
        make("serverRack", 31, 1, FACE_S),
        make("filingCabinet", 31.75, 5.75),

        // Workspace: six pods of six.
        ...pod(2, 8.75, 3),
        ...pod(9, 8.75, 3),
        ...pod(16, 8.75, 3),
        ...pod(2, 12.75, 3),
        ...pod(9, 12.75, 3),
        ...pod(16, 12.75, 3),
        make("printer", 22, 7),

        // Kitchen: counters, a bar island, a dining table.
        make("kitchenCounter", 31.5, 8, FACE_W),
        make("kitchenCounter", 31.5, 10, FACE_W),
        make("fridge", 31.5, 11.5, FACE_W),
        make("ovalBarTable", 28, 10),
        ...[27.25, 28.25].flatMap((x) => [make("barStool", x, 9.25), make("barStool", x, 10.75)]),
        make("ovalTable", 25, 13.25),
        ...[24, 25, 26].flatMap((x) => [
          make("seat", x, 12, FACE_S),
          make("seat", x, 14.5, FACE_N),
        ]),
        make("vendingMachine", 24, 7, FACE_S),
        make("cooler", 25.25, 6.75),
        make("trashBin", 30.25, 7.25),

        // Restrooms: three stalls and two sinks each.
        ...westRestroom.toilets,
        make("bathroomSink", 1.5, 15.25),
        make("bathroomSink", 3, 15.25),
        ...eastRestroom.toilets,
        make("bathroomSink", 29, 15.25),
        make("bathroomSink", 30.5, 15.25),

        // Lounge.
        make("rug", 10, 17.5),
        make("sofa", 10, 16, FACE_S),
        make("sofa", 10, 19.5, FACE_N),
        make("coffeeTable", 10.25, 17.5),
        make("armchair", 7.5, 17.5, FACE_E),
        make("armchair", 13, 17.5, FACE_W),
        make("bookshelf", 5.25, 18.25, FACE_E),
        make("plant", 13.75, 19.75),

        // Reception at the entrance.
        make("ovalBarTable", 18, 16.5),
        make("sofa", 15, 18.5, FACE_E),
        make("coatRack", 19.25, 19.75),
        make("plant", 16.75, 19.75),
        make("plant", 21.75, 19.75),
      ]
    },
  },
  {
    id: "studio",
    label: msg("Studio"),
    description: msg("20 desks, glass meeting room & booths, coffee bar"),
    build: () => {
      sequence = 0
      // 20 × 12 m. Two benches of desks; glass meeting room and two glass
      // booths in the north-east; along the south: restrooms, a lounge by the
      // entrance and a coffee bar.
      const restroom = stalls(0, 12, 2, -1)
      const walls = withOpenings(
        [
          ...roomWalls(0, 0, 20, 12),
          ...glassLine(14, 0, 14, 8), // meeting room and booths
          ...glassLine(14, 5, 20, 5),
          ...glassLine(17, 5, 17, 8),
          ...glassLine(14, 8, 20, 8),
          ...line(0, 8, 4.5, 8), // restrooms
          ...line(4.5, 8, 4.5, 12),
          ...restroom.walls,
        ],
        [
          ["door", 8, 12], // entrance
          ["glassDoor", 14, 2.5, true], // meeting room
          ["glassDoor", 15.5, 8], // booths
          ["glassDoor", 18.5, 8],
          ["door", 4.5, 9, true], // restrooms
          ...restroom.doors,
          ["window", 2, 0],
          ["window", 5, 0],
          ["window", 8, 0],
          ["window", 11, 0],
          ["window", 16, 0],
          ["window", 18, 0],
          ["window", 0, 2.5, true],
          ["window", 0, 5.5, true],
          ["window", 20, 1, true],
          ["window", 20, 6.5, true],
          ["window", 11, 12],
        ]
      )
      return [
        ...walls,

        // Two benches of ten.
        ...pod(2, 2.25, 5),
        ...pod(2, 5.75, 5),
        make("plant", 12.75, 0.25),
        make("plant", 12.75, 4.25),

        // Glass meeting room for six.
        make("meetingTable", 17, 2.5),
        ...[16, 17, 18].flatMap((x) => [make("seat", x, 1, FACE_S), make("seat", x, 4, FACE_N)]),
        make("tvScreen", 19.75, 2.75, FACE_W),

        // Two booths: an armchair and a side table.
        make("armchair", 15.5, 6.5, FACE_E),
        make("squareTable", 16.5, 6.5),
        make("armchair", 18.5, 6.5, FACE_E),
        make("squareTable", 19.5, 6.5),

        // Restrooms: two stalls, two sinks.
        ...restroom.toilets,
        make("bathroomSink", 1.5, 8.25),
        make("bathroomSink", 3.5, 8.25),

        // Lounge by the entrance.
        make("rug", 10.5, 10.5),
        make("sofa", 10.5, 11.5, FACE_N),
        make("armchair", 9.5, 9.5, FACE_S),
        make("armchair", 11.5, 9.5, FACE_S),
        make("coffeeTable", 10.75, 10.5),
        make("coatRack", 6.75, 11.75),
        make("plant", 4.75, 11.75),

        // Coffee bar.
        make("kitchenCounter", 19.5, 9.5, FACE_W),
        make("fridge", 19.5, 11.5, FACE_W),
        make("ovalBarTable", 16, 10.5),
        ...[15.25, 16.75].flatMap((x) => [make("barStool", x, 9.75), make("barStool", x, 11.25)]),
        make("vendingMachine", 13.5, 11.5, FACE_N),
        make("cooler", 14.75, 11.75),
      ]
    },
  },
]
