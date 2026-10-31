import { wallRun } from "~/editor/core"
import { type Cell, type ObjectType, type SceneObject } from "~/editor/core"
import { msg } from "~/i18n/msg"

const HALF = Math.PI / 2

let sequence = 0
const createId = () => `tpl-${(sequence++).toString(36)}`

type Placement = Pick<SceneObject, "x" | "z"> & { rotation?: number }

const make = (type: ObjectType, { x, z, rotation = 0 }: Placement): SceneObject => ({
  id: createId(),
  type,
  x,
  z,
  rotation,
})

/** Wall half-segments along a straight line between two grid nodes. */
const line = (from: Cell, to: Cell): SceneObject[] =>
  wallRun(from, to).map((placement) => make("wall", placement))

/** The same, as glass (meeting rooms and booths you can see into). */
const glassLine = (from: Cell, to: Cell): SceneObject[] =>
  wallRun(from, to).map((placement) => make("glassWall", placement))

/** Wall half-segments around the rectangle spanning grid nodes `from`-`to`. */
const roomWalls = (from: Cell, to: Cell): SceneObject[] => [
  ...line(from, { x: to.x, z: from.z }),
  ...line({ x: from.x, z: to.z }, to),
  ...line(from, { x: from.x, z: to.z }),
  ...line({ x: to.x, z: from.z }, to),
]

/**
 * Cut an opening (door or window, 1 unit = two wall halves) into a wall,
 * centred at (x, z): the two halves it covers are replaced by it.
 * `isVertical` = a wall running along Z.
 */
type OpeningKind = "door" | "window" | "glassDoor"

interface Opening {
  kind: OpeningKind
  x: number
  z: number
  isVertical?: boolean
}

const withOpening = (
  walls: SceneObject[],
  { kind, x, z, isVertical = false }: Opening
): SceneObject[] => [
  ...walls.filter((wall) =>
    isVertical
      ? !(wall.rotation === HALF && wall.x === x && Math.abs(wall.z - z) < 0.5)
      : !(wall.rotation === 0 && wall.z === z && Math.abs(wall.x - x) < 0.5)
  ),
  make(kind, { x, z, rotation: isVertical ? HALF : 0 }),
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
    (current, [kind, x, z, isVertical]) => withOpening(current, { kind, x, z, isVertical }),
    unique
  )
}

/**
 * A bookable desk, its chair in front (facing +Z), the desk itself at (x, z):
 * a workstation's desk sits 0.25 m back from its centre.
 */
const deskWithChair = (x: number, z: number): SceneObject[] => [
  make("workstation", { x, z: z + 0.25, rotation: 0 }),
]

/**
 * A desk pod: `pairs` workstations side by side (2 m apart, from `x`), each
 * facing one across the middle — the north row at `z`, the south row 1.5 m on.
 */
const pod = (x: number, z: number, pairs: number): SceneObject[] =>
  Array.from({ length: pairs }, (_, i) => [
    make("workstation", { x: x + i * 2, z, rotation: FACE_N }),
    make("workstation", { x: x + i * 2, z: z + 1.5, rotation: FACE_S }),
  ]).flat()

interface StallsOptions {
  x: number
  back: number
  count: number
  direction: 1 | -1
}

/**
 * Restroom stalls in a row against a wall: each 1.5 m wide and deep, a toilet
 * at the back, its door in the front partition. `back` is the wall's z, and
 * `direction` which way the stalls open (−1: the wall is to the south, doors north).
 * Returns the partitions (walls) and the toilets; doors are cut by the caller.
 */
const stalls = ({ x, back, count, direction }: StallsOptions) => {
  const front = back + direction * 1.5
  const walls = [
    ...line({ x, z: front }, { x: x + count * 1.5, z: front }),
    ...Array.from({ length: count + 1 }, (_, i) => i)
      .filter((i) => i > 0)
      .flatMap((i) =>
        line(
          { x: x + i * 1.5, z: Math.min(back, front) },
          { x: x + i * 1.5, z: Math.max(back, front) }
        )
      ),
  ]
  const toilets = Array.from({ length: count }, (_, i) =>
    make("toilet", {
      x: x + i * 1.5 + 0.75,
      z: back + direction * 0.5,
      rotation: direction > 0 ? FACE_S : FACE_N,
    })
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
        ...withOpenings(roomWalls({ x: 0, z: 0 }, { x: 16, z: 11 }), [
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
        ...line({ x: 11, z: 0 }, { x: 11, z: 5.5 }),
        ...withOpening(line({ x: 11, z: 5.5 }, { x: 16, z: 5.5 }), {
          kind: "door",
          x: 13.5,
          z: 5.5,
        }),
      ]

      // Open workspace: two desk pods (desks meet in the middle, chairs out).
      const desks = [1.5, 3.5, 5.5, 7.5].flatMap((x) => [
        make("workstation", { x, z: 2.25, rotation: FACE_N }),
        make("workstation", { x, z: 3.75, rotation: FACE_S }),
      ])

      return [
        ...walls,
        ...desks,

        // Storage + printing along the north wall.
        make("lockers", { x: 1.25, z: 0.25 }),
        make("lockers", { x: 2.75, z: 0.25 }),
        make("bookshelf", { x: 4.75, z: 0.25 }),
        make("bookshelf", { x: 6.25, z: 0.25 }),
        make("trashBin", { x: 9.25, z: 0.25 }),
        make("printer", { x: 10, z: 0.5 }),
        make("filingCabinet", { x: 10.75, z: 0.25 }),
        make("floorLamp", { x: 8.75, z: 1.25 }),
        make("whiteboard", { x: 9.75, z: 2.75, rotation: FACE_W }),
        make("plant", { x: 0.25, z: 5.75 }),
        make("plant", { x: 9.25, z: 5.25 }),

        // Meeting room: table for six, a display on the east wall.
        make("meetingTable", { x: 13.5, z: 2.5 }),
        ...[12.5, 13.5, 14.5].flatMap((x) => [
          make("seat", { x, z: 1, rotation: FACE_S }),
          make("seat", { x, z: 4, rotation: FACE_N }),
        ]),
        make("tvScreen", { x: 15.75, z: 2.75, rotation: FACE_W }),
        make("plant", { x: 11.25, z: 0.25 }),
        make("plant", { x: 15.75, z: 0.25 }),
        make("floorLamp", { x: 15.75, z: 5.25 }),

        // Kitchen corner: counters, fridge, a small table, drinks.
        make("kitchenCounter", { x: 15.5, z: 7, rotation: FACE_W }),
        make("fridge", { x: 15.5, z: 8.5, rotation: FACE_W }),
        make("kitchenCounter", { x: 14, z: 10.5, rotation: FACE_N }),
        make("trashBin", { x: 15.75, z: 10.75 }),
        make("vendingMachine", { x: 12, z: 10.5, rotation: FACE_N }),
        make("cooler", { x: 11.25, z: 10.75 }),
        make("coffeeTable", { x: 12.75, z: 7.5 }),
        make("seat", { x: 11.5, z: 7.5, rotation: FACE_E }),
        make("seat", { x: 12.5, z: 6.5, rotation: FACE_S }),
        make("seat", { x: 13, z: 8.5, rotation: FACE_N }),
        make("floorLamp", { x: 11.25, z: 5.75 }),

        // Lounge: rug, two sofas around a coffee table, reading corner.
        make("rug", { x: 3, z: 8.5 }),
        make("sofa", { x: 3, z: 7, rotation: FACE_S }),
        make("sofa", { x: 3, z: 10, rotation: FACE_N }),
        make("coffeeTable", { x: 3.25, z: 8.5 }),
        make("bookshelf", { x: 0.25, z: 8.25, rotation: FACE_E }),
        make("floorLamp", { x: 1.25, z: 6.75 }),
        make("floorLamp", { x: 4.75, z: 10.25 }),
        make("plant", { x: 0.25, z: 10.75 }),
        make("plant", { x: 6.75, z: 10.75 }),
        make("plant", { x: 8.25, z: 10.75 }),
      ]
    },
  },
  {
    id: "open-plan",
    label: msg("Open plan"),
    build: () => {
      sequence = 0
      // Entrance door on the bottom edge, windows on the other three sides.
      const walls = withOpenings(roomWalls({ x: 0, z: 0 }, { x: 10, z: 7 }), [
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
        make("plant", { x: 8.75, z: 1.25 }),
        make("plant", { x: 8.75, z: 5.25 }),
        make("cooler", { x: 1.25, z: 5.75 }),
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
        ...withOpenings(roomWalls({ x: 0, z: 0 }, { x: 12, z: 7 }), [
          ["door", 8.5, 7],
          ["window", 8.5, 0],
          ["window", 10.5, 0],
          ["window", 0, 3.5, true],
          ["window", 12, 2.5, true],
        ]),
        ...line({ x: 5, z: 0 }, { x: 5, z: 3 }),
        ...line({ x: 5, z: 4 }, { x: 5, z: 7 }),
      ]

      return [
        ...walls,
        // Each table lengthwise, two chairs a side.
        make("meetingTable", { x: 2.5, z: 3.5, rotation: HALF }),
        ...[2.5, 4.5].flatMap((z) => [
          make("seat", { x: 1, z, rotation: FACE_E }),
          make("seat", { x: 4, z, rotation: FACE_W }),
        ]),
        make("meetingTable", { x: 8.5, z: 3.5, rotation: HALF }),
        ...[2.5, 4.5].flatMap((z) => [
          make("seat", { x: 7, z, rotation: FACE_E }),
          make("seat", { x: 10, z, rotation: FACE_W }),
        ]),
        make("whiteboard", { x: 2.75, z: 0.25 }),
        make("plant", { x: 11.25, z: 6.25 }),
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
      const restroom = stalls({ x: 0, back: 14, count: 3, direction: -1 })
      const walls = withOpenings(
        [
          ...roomWalls({ x: 0, z: 0 }, { x: 24, z: 14 }),
          ...line({ x: 15, z: 0 }, { x: 15, z: 5 }), // meeting room
          ...line({ x: 15, z: 5 }, { x: 24, z: 5 }),
          ...line({ x: 15, z: 5 }, { x: 15, z: 9 }), // focus rooms
          ...line({ x: 19.5, z: 5 }, { x: 19.5, z: 9 }),
          ...line({ x: 15, z: 9 }, { x: 24, z: 9 }),
          ...line({ x: 0, z: 10 }, { x: 5, z: 10 }), // restrooms
          ...line({ x: 5, z: 10 }, { x: 5, z: 14 }),
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
        make("whiteboard", { x: 14.75, z: 6.75, rotation: FACE_W }),
        make("printer", { x: 14, z: 9 }),
        make("lockers", { x: 0.25, z: 9.25, rotation: FACE_E }),
        make("plant", { x: 0.25, z: 0.25 }),
        make("plant", { x: 14.75, z: 0.25 }),

        // Meeting room for six, a screen at the end.
        make("meetingTable", { x: 19.5, z: 2.5 }),
        ...[18.5, 19.5, 20.5].flatMap((x) => [
          make("seat", { x, z: 1, rotation: FACE_S }),
          make("seat", { x, z: 4, rotation: FACE_N }),
        ]),
        make("tvScreen", { x: 23.75, z: 2.75, rotation: FACE_W }),
        make("plant", { x: 15.25, z: 0.25 }),
        make("plant", { x: 23.75, z: 4.75 }),

        // Two focus rooms, a small table for three each.
        make("squareTable", { x: 17, z: 7 }),
        make("seat", { x: 16, z: 7, rotation: FACE_E }),
        make("seat", { x: 18, z: 7, rotation: FACE_W }),
        make("seat", { x: 17, z: 6, rotation: FACE_S }),
        make("plant", { x: 19.25, z: 5.25 }),
        make("squareTable", { x: 21.5, z: 7 }),
        make("seat", { x: 20.5, z: 7, rotation: FACE_E }),
        make("seat", { x: 22.5, z: 7, rotation: FACE_W }),
        make("seat", { x: 21.5, z: 6, rotation: FACE_S }),
        make("plant", { x: 23.75, z: 5.25 }),

        // Restrooms: three stalls, two sinks.
        ...restroom.toilets,
        make("bathroomSink", { x: 1.5, z: 10.25 }),
        make("bathroomSink", { x: 3, z: 10.25 }),
        make("trashBin", { x: 4.75, z: 10.25 }),

        // Lounge by the entrance.
        make("planterBox", { x: 8, z: 9.75 }),
        make("planterBox", { x: 11, z: 9.75 }),
        make("rug", { x: 8, z: 12 }),
        make("sofa", { x: 8, z: 10.5, rotation: FACE_S }),
        make("sofa", { x: 8, z: 13.5, rotation: FACE_N }),
        make("coffeeTable", { x: 8.25, z: 12 }),
        make("armchair", { x: 6, z: 12, rotation: FACE_E }),
        make("coatRack", { x: 11.25, z: 13.75 }),
        make("plant", { x: 5.25, z: 13.75 }),
        make("plant", { x: 14.75, z: 13.75 }),

        // Kitchen and dining.
        make("kitchenCounter", { x: 23.5, z: 10, rotation: FACE_W }),
        make("kitchenCounter", { x: 23.5, z: 12, rotation: FACE_W }),
        make("fridge", { x: 23.5, z: 13.5, rotation: FACE_W }),
        make("vendingMachine", { x: 22, z: 13.5, rotation: FACE_N }),
        make("cooler", { x: 21.25, z: 13.75 }),
        make("trashBin", { x: 22.75, z: 9.25 }),
        make("ovalTable", { x: 19, z: 11.75 }),
        ...[18, 19, 20].flatMap((x) => [
          make("seat", { x, z: 10.5, rotation: FACE_S }),
          make("seat", { x, z: 13, rotation: FACE_N }),
        ]),
        make("plant", { x: 15.25, z: 13.75 }),
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
      const westRestroom = stalls({ x: 0, back: 20, count: 3, direction: -1 })
      const eastRestroom = stalls({ x: 27.5, back: 20, count: 3, direction: -1 })
      const walls = withOpenings(
        [
          ...roomWalls({ x: 0, z: 0 }, { x: 32, z: 20 }),
          ...line({ x: 0, z: 6 }, { x: 23, z: 6 }), // north rooms
          ...line({ x: 11, z: 0 }, { x: 11, z: 6 }),
          ...line({ x: 17, z: 0 }, { x: 17, z: 6 }),
          ...line({ x: 23, z: 0 }, { x: 23, z: 6 }),
          ...line({ x: 23, z: 3 }, { x: 29, z: 3 }), // phone booths
          ...[24.5, 26, 27.5].flatMap((x) => line({ x, z: 0 }, { x, z: 3 })),
          ...line({ x: 29, z: 0 }, { x: 29, z: 6 }), // server room
          ...line({ x: 29, z: 6 }, { x: 32, z: 6 }),
          ...line({ x: 0, z: 15 }, { x: 5, z: 15 }), // restrooms, west
          ...line({ x: 5, z: 15 }, { x: 5, z: 20 }),
          ...westRestroom.walls,
          ...line({ x: 27, z: 15 }, { x: 32, z: 15 }), // restrooms, east
          ...line({ x: 27, z: 15 }, { x: 27, z: 20 }),
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
        make("meetingTable", { x: 3.5, z: 3 }),
        make("meetingTable", { x: 7.5, z: 3 }),
        ...[2, 3, 4, 5, 6, 7, 8, 9].flatMap((x) => [
          make("seat", { x, z: 1.5, rotation: FACE_S }),
          make("seat", { x, z: 4.5, rotation: FACE_N }),
        ]),
        make("seat", { x: 1, z: 3, rotation: FACE_E }),
        make("seat", { x: 10, z: 3, rotation: FACE_W }),
        make("wallTv", { x: 10.75, z: 3.25, rotation: FACE_W }),
        make("plant", { x: 0.25, z: 0.25 }),
        make("plant", { x: 10.75, z: 0.25 }),

        // Two meeting rooms for six.
        make("meetingTable", { x: 14, z: 3 }),
        ...[13, 14, 15].flatMap((x) => [
          make("seat", { x, z: 1.5, rotation: FACE_S }),
          make("seat", { x, z: 4.5, rotation: FACE_N }),
        ]),
        make("whiteboard", { x: 11.25, z: 3.25, rotation: FACE_E }),
        make("meetingTable", { x: 20, z: 3 }),
        ...[19, 20, 21].flatMap((x) => [
          make("seat", { x, z: 1.5, rotation: FACE_S }),
          make("seat", { x, z: 4.5, rotation: FACE_N }),
        ]),
        make("tvScreen", { x: 22.75, z: 3.25, rotation: FACE_W }),

        // Phone booths, and the server room.
        ...[23.5, 25, 26.5, 28].map((x) => make("armchair", { x, z: 1, rotation: FACE_S })),
        make("serverRack", { x: 30, z: 1, rotation: FACE_S }),
        make("serverRack", { x: 31, z: 1, rotation: FACE_S }),
        make("filingCabinet", { x: 31.75, z: 5.75 }),

        // Workspace: six pods of six.
        ...pod(2, 8.75, 3),
        ...pod(9, 8.75, 3),
        ...pod(16, 8.75, 3),
        ...pod(2, 12.75, 3),
        ...pod(9, 12.75, 3),
        ...pod(16, 12.75, 3),
        make("printer", { x: 22, z: 7 }),

        // Kitchen: counters, a bar island, a dining table.
        make("kitchenCounter", { x: 31.5, z: 8, rotation: FACE_W }),
        make("kitchenCounter", { x: 31.5, z: 10, rotation: FACE_W }),
        make("fridge", { x: 31.5, z: 11.5, rotation: FACE_W }),
        make("ovalBarTable", { x: 28, z: 10 }),
        ...[27.25, 28.25].flatMap((x) => [
          make("barStool", { x, z: 9.25 }),
          make("barStool", { x, z: 10.75 }),
        ]),
        make("ovalTable", { x: 25, z: 13.25 }),
        ...[24, 25, 26].flatMap((x) => [
          make("seat", { x, z: 12, rotation: FACE_S }),
          make("seat", { x, z: 14.5, rotation: FACE_N }),
        ]),
        make("vendingMachine", { x: 24, z: 7, rotation: FACE_S }),
        make("cooler", { x: 25.25, z: 6.75 }),
        make("trashBin", { x: 30.25, z: 7.25 }),

        // Restrooms: three stalls and two sinks each.
        ...westRestroom.toilets,
        make("bathroomSink", { x: 1.5, z: 15.25 }),
        make("bathroomSink", { x: 3, z: 15.25 }),
        ...eastRestroom.toilets,
        make("bathroomSink", { x: 29, z: 15.25 }),
        make("bathroomSink", { x: 30.5, z: 15.25 }),

        // Lounge.
        make("rug", { x: 10, z: 17.5 }),
        make("sofa", { x: 10, z: 16, rotation: FACE_S }),
        make("sofa", { x: 10, z: 19.5, rotation: FACE_N }),
        make("coffeeTable", { x: 10.25, z: 17.5 }),
        make("armchair", { x: 7.5, z: 17.5, rotation: FACE_E }),
        make("armchair", { x: 13, z: 17.5, rotation: FACE_W }),
        make("bookshelf", { x: 5.25, z: 18.25, rotation: FACE_E }),
        make("plant", { x: 13.75, z: 19.75 }),

        // Reception at the entrance.
        make("ovalBarTable", { x: 18, z: 16.5 }),
        make("sofa", { x: 15, z: 18.5, rotation: FACE_E }),
        make("coatRack", { x: 19.25, z: 19.75 }),
        make("plant", { x: 16.75, z: 19.75 }),
        make("plant", { x: 21.75, z: 19.75 }),
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
      const restroom = stalls({ x: 0, back: 12, count: 2, direction: -1 })
      const walls = withOpenings(
        [
          ...roomWalls({ x: 0, z: 0 }, { x: 20, z: 12 }),
          ...glassLine({ x: 14, z: 0 }, { x: 14, z: 8 }), // meeting room and booths
          ...glassLine({ x: 14, z: 5 }, { x: 20, z: 5 }),
          ...glassLine({ x: 17, z: 5 }, { x: 17, z: 8 }),
          ...glassLine({ x: 14, z: 8 }, { x: 20, z: 8 }),
          ...line({ x: 0, z: 8 }, { x: 4.5, z: 8 }), // restrooms
          ...line({ x: 4.5, z: 8 }, { x: 4.5, z: 12 }),
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
        make("plant", { x: 12.75, z: 0.25 }),
        make("plant", { x: 12.75, z: 4.25 }),

        // Glass meeting room for six.
        make("meetingTable", { x: 17, z: 2.5 }),
        ...[16, 17, 18].flatMap((x) => [
          make("seat", { x, z: 1, rotation: FACE_S }),
          make("seat", { x, z: 4, rotation: FACE_N }),
        ]),
        make("tvScreen", { x: 19.75, z: 2.75, rotation: FACE_W }),

        // Two booths: an armchair and a side table.
        make("armchair", { x: 15.5, z: 6.5, rotation: FACE_E }),
        make("squareTable", { x: 16.5, z: 6.5 }),
        make("armchair", { x: 18.5, z: 6.5, rotation: FACE_E }),
        make("squareTable", { x: 19.5, z: 6.5 }),

        // Restrooms: two stalls, two sinks.
        ...restroom.toilets,
        make("bathroomSink", { x: 1.5, z: 8.25 }),
        make("bathroomSink", { x: 3.5, z: 8.25 }),

        // Lounge by the entrance.
        make("rug", { x: 10.5, z: 10.5 }),
        make("sofa", { x: 10.5, z: 11.5, rotation: FACE_N }),
        make("armchair", { x: 9.5, z: 9.5, rotation: FACE_S }),
        make("armchair", { x: 11.5, z: 9.5, rotation: FACE_S }),
        make("coffeeTable", { x: 10.75, z: 10.5 }),
        make("coatRack", { x: 6.75, z: 11.75 }),
        make("plant", { x: 4.75, z: 11.75 }),

        // Coffee bar.
        make("kitchenCounter", { x: 19.5, z: 9.5, rotation: FACE_W }),
        make("fridge", { x: 19.5, z: 11.5, rotation: FACE_W }),
        make("ovalBarTable", { x: 16, z: 10.5 }),
        ...[15.25, 16.75].flatMap((x) => [
          make("barStool", { x, z: 9.75 }),
          make("barStool", { x, z: 11.25 }),
        ]),
        make("vendingMachine", { x: 13.5, z: 11.5, rotation: FACE_N }),
        make("cooler", { x: 14.75, z: 11.75 }),
      ]
    },
  },
]
