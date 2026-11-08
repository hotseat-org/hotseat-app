/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { composeDeskFacts, type DeskAround } from "./deskFacts"
import { cs } from "~/i18n/cs"
import { createTranslator, registerMessages } from "~/i18n/translate"

registerMessages("cs", cs)

const english = createTranslator("en")
const czech = createTranslator("cs")

const SEAT = { id: "d2", x: 0, z: 0, floor: "main" }
const at = (
  id: string,
  [x, z]: [number, number],
  { name, floor = "main" }: { name?: string; floor?: string } = {}
): DeskAround => ({ desk: { id, x, z, floor }, name })

describe("a desk's facts", () => {
  test("who sits next to it, and whose corner it's in", () => {
    const desks = [
      at("d1", [1.6, 0], { name: "Lena" }),
      at("d3", [0, 1.6], { name: "Max" }),
      at("d9", [9, 0], { name: "Petra" }),
    ]

    expect(composeDeskFacts(english, { seat: SEAT, desks, teamName: "Design" })).toEqual([
      "In Design's corner.",
      "Next to Lena and Max.",
    ])
    expect(composeDeskFacts(czech, { seat: SEAT, desks, teamName: "Design" })).toEqual([
      "V koutě týmu Design.",
      "Vedle: Lena a Max.",
    ])
  })

  test("free desks around it: quiet", () => {
    const desks = [at("d1", [1.6, 0]), at("d3", [0, 1.6])]

    expect(composeDeskFacts(english, { seat: SEAT, desks })).toEqual([
      "Nobody sits next to it, so it's quiet.",
    ])
  })

  test("nothing to say about a desk on its own, or about other floors", () => {
    const desks = [
      at("d9", [9, 0], { name: "Petra" }),
      at("d1", [1, 0], { name: "Lena", floor: "attic" }),
    ]

    expect(composeDeskFacts(english, { seat: SEAT, desks })).toEqual([])
  })
})
