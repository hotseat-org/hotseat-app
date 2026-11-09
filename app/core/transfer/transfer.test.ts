/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import type { CoreContext } from "../types"
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  ExportFileError,
  exportOrganization,
  readExportFile,
} from "."
import type { OrganizationRows } from "~/repositories/main-repository/methods/transfer"

const createdAt = new Date("2026-11-02T09:00:00.000Z")

/** An organization with a logo, an office with a cover, and two people: one photo of ours, one kept elsewhere. */
const ROWS = {
  organization: { slug: "acme", name: "Acme", thumbnail: "logo-id", createdAt },
  users: [
    { email: "ada@acme.com", displayName: "Ada", avatarUrl: "photo-id", createdAt },
    { email: "bo@acme.com", displayName: "Bo", avatarUrl: "https://example.com/bo.jpg" },
  ],
  profiles: [],
  invites: [],
  offices: [{ slug: "hq", name: "HQ", thumbnail: "cover-id", layout: null }],
  closedDays: [],
  reservations: [{ id: "r1", date: new Date("2026-11-10T00:00:00.000Z") }],
  deskReleases: [],
  favoriteDesks: [],
  usualDesks: [],
  seatRules: [],
  waitlist: [],
  roomKits: [],
  teams: [],
  teamMembers: [],
  teamZones: [],
  notifications: [],
  organizationRedirects: [],
  officeRedirects: [],
} as unknown as OrganizationRows

/** A context whose images are the ids' own bytes (the cover's is gone from storage). */
const createContext = () => {
  const read = async (id: string) =>
    id === "cover-id" ? null : { bytes: new TextEncoder().encode(id), type: "image/png" }

  return {
    mainRepository: { transfer: { find: async () => ROWS } },
    imageService: { read },
  } as unknown as CoreContext
}

const readExport = async (stream: ReadableStream) =>
  readExportFile(await new Response(stream).blob())

describe("exportOrganization", () => {
  test("writes the rows and the images of ours, as gzipped JSON", async () => {
    const stream = await exportOrganization(createContext())("acme")
    const file = await readExport(stream!)

    expect(file.format).toBe(EXPORT_FORMAT)
    expect(file.version).toBe(EXPORT_VERSION)
    expect(file.rows.organization.name).toBe("Acme")
    expect(file.rows.reservations[0].date).toBe("2026-11-10T00:00:00.000Z")
    // A photo kept elsewhere stays a URL, and an unreadable one is left out.
    expect(Object.keys(file.images).sort()).toEqual(["logo-id", "photo-id"])
    expect(Buffer.from(file.images["photo-id"].data, "base64").toString()).toBe("photo-id")
  })

  test("nothing for an organization that isn't there", async () => {
    const context = {
      ...createContext(),
      mainRepository: { transfer: { find: async () => null } },
    } as unknown as CoreContext

    expect(await exportOrganization(context)("gone")).toBeNull()
  })
})

describe("readExportFile", () => {
  const plain = JSON.stringify({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    rows: JSON.parse(JSON.stringify(ROWS)),
    images: {},
  })

  test("takes it gzipped or not", async () => {
    const file = await readExportFile(new Blob([plain]))

    expect(file.rows.organization.slug).toBe("acme")
  })

  test("turns away anything else", async () => {
    const notJson = new Blob(["nope"])
    const otherJson = new Blob([JSON.stringify({ hello: 1 })])
    const missingRows = new Blob([
      JSON.stringify({ format: EXPORT_FORMAT, version: 1, rows: {}, images: {} }),
    ])

    for (const file of [notJson, otherJson, missingRows])
      await expect(readExportFile(file)).rejects.toBeInstanceOf(ExportFileError)
  })

  test("tells a newer Hotseat's export apart", async () => {
    const newer = JSON.stringify({ ...JSON.parse(plain), version: EXPORT_VERSION + 1 })
    const error = await readExportFile(new Blob([newer])).catch((caught) => caught)

    expect(error).toBeInstanceOf(ExportFileError)
    expect(error.isNewer).toBe(true)
  })
})
