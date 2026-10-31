/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { layoutSchema } from "./schema"

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

    expect(parsed[1].noteText).toBe("Fix the door")
  })

  test("refuses what isn't in the catalogue", () => {
    expect(layoutSchema.safeParse([pieceOf("spaceship")]).success).toBe(false)
  })
})
