/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { cs } from "./cs"
import { createTranslator, registerMessages } from "./translate"

registerMessages("cs", cs)

describe("translating", () => {
  test("a capitalised placeholder starts a sentence with its value", () => {
    const { t } = createTranslator("cs")

    expect(t("No desk {when}.", { when: t("today") })).toBe("Dnes nemáte stůl.")
    expect(t("No desk {when}", { when: "ve středu 4. 11." })).toBe("Ve středu 4. 11. nemáte stůl")
  })

  test("a placeholder keeps its value as it is", () => {
    const { t } = createTranslator("cs")

    expect(t("{holder} has this desk {when}.", { holder: "Jana", when: "dnes" })).toBe(
      "Jana má dnes tento stůl."
    )
  })
})
