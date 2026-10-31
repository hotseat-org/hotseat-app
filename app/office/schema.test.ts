/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { layoutSchema, parseLayout } from "./schema"

/** Every type the hand-written list allowed before the catalogue decided: old layouts hold them. */
const TYPES_SAVED_BEFORE = (
  "wall door window glassWall glassDoor desk seat plant workstation deskmate sofa coffeeTable " +
  "meetingTable bookshelf rug cooler filingCabinet lockers printer tvScreen whiteboard " +
  "vendingMachine floorLamp trashBin kitchenCounter fridge armchair ceilingLight wardrobe " +
  "barStool barTable toilet shower bathroomSink roundTable squareTable ovalTable ovalBarTable " +
  "serverRack shelvingUnit wallTv wallArt wallClock wallShelf coatRack planterBox divider floorPaint"
).split(" ")

const pieceOf = (type: string, fields = {}) => ({
  id: "a",
  type,
  x: 0,
  z: 0,
  rotation: 0,
  ...fields,
})

describe("a saved layout", () => {
  test("holds every item saved before", () => {
    for (const type of TYPES_SAVED_BEFORE)
      expect(layoutSchema.safeParse([pieceOf(type)]).success).toBe(true)
  })

  test("holds fences and notes, with the note's text", () => {
    const parsed = layoutSchema.parse([
      pieceOf("fence"),
      pieceOf("note", { noteText: "Fix the door" }),
    ])

    expect(parsed.pieces[1].noteText).toBe("Fix the door")
  })

  test("refuses what isn't in the catalogue", () => {
    expect(layoutSchema.safeParse([pieceOf("spaceship")]).success).toBe(false)
  })
})

describe("a layout's floors", () => {
  test("one saved before floors is one floor", () => {
    const { floors, pieces } = layoutSchema.parse([pieceOf("desk")])

    expect(floors).toHaveLength(1)
    expect(pieces).toHaveLength(1)
  })

  test("are kept with each piece's floor", () => {
    const { floors, pieces } = layoutSchema.parse({
      floors: [
        { id: "floor-1", name: "" },
        { id: "floor-2", name: "Attic" },
      ],
      pieces: [pieceOf("desk", { floor: "floor-2" })],
    })

    expect(floors.map((floor) => floor.name)).toEqual(["", "Attic"])
    expect(pieces[0].floor).toBe("floor-2")
  })

  test("are at least one", () => {
    expect(layoutSchema.safeParse({ floors: [], pieces: [] }).success).toBe(false)
  })

  test("an unreadable layout reads as an empty one", () => {
    expect(parseLayout({ nonsense: true })).toEqual({
      floors: [{ id: "floor-1", name: "" }],
      pieces: [],
    })
  })
})
