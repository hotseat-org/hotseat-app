/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { loadOncePerRequest } from "./oncePerRequest"

const counting = () => {
  let count = 0
  const load = async () => ++count

  return { load, getCount: () => count }
}

describe("loadOncePerRequest", () => {
  test("loaders of one request share a single load", async () => {
    const { load, getCount } = counting()
    const request = new Request("https://example.com/")

    const results = await Promise.all([
      loadOncePerRequest(request, "profile", load),
      loadOncePerRequest(request, "profile", load),
    ])

    expect(results).toEqual([1, 1])
    expect(getCount()).toBe(1)
  })

  test("another key is loaded on its own", async () => {
    const { load, getCount } = counting()
    const request = new Request("https://example.com/")

    await loadOncePerRequest(request, "profile:acme", load)
    await loadOncePerRequest(request, "profile:other", load)

    expect(getCount()).toBe(2)
  })

  test("another request loads afresh", async () => {
    const { load, getCount } = counting()

    await loadOncePerRequest(new Request("https://example.com/"), "profile", load)
    await loadOncePerRequest(new Request("https://example.com/"), "profile", load)

    expect(getCount()).toBe(2)
  })
})
