/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { getTagDetail } from "./tagDetail"

describe("how much a desk's tag shows", () => {
  test("by how big desks are on screen", () => {
    expect(getTagDetail(20, "middle")).toBe("far")
    expect(getTagDetail(45, "far")).toBe("middle")
    expect(getTagDetail(90, "middle")).toBe("close")
  })

  test("holds at a threshold's edge until clearly past it", () => {
    // Just past "close" from below: not yet; just under it from above: still close.
    expect(getTagDetail(63, "middle")).toBe("middle")
    expect(getTagDetail(60, "close")).toBe("close")
    expect(getTagDetail(55, "close")).toBe("middle")
    expect(getTagDetail(33, "middle")).toBe("middle")
    expect(getTagDetail(30, "middle")).toBe("far")
  })
})
