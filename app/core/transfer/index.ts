import type { CoreContext } from "../types"
import type { JsonRows, OrganizationRows } from "~/repositories/main-repository/methods/transfer"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

/**
 * An organization, whole, in one file: to move from the hosted service to a
 * company's own installation (or keep as a copy). Its rows as the database
 * has them, and its images (logo, office covers, people's photos) inside —
 * gzipped JSON:
 *
 *   { format, version, exportedAt, rows: { organization, users, … },
 *     images: { [id]: { type, data (base64) } } }
 */
export const EXPORT_FORMAT = "hotseat-organization"
export const EXPORT_VERSION = 1

interface ExportedImage {
  type: string
  data: string
}

export interface OrganizationExport {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string
  rows: JsonRows<OrganizationRows>
  images: Record<string, ExportedImage>
}

/** A file that isn't an export of ours, or one made by a newer Hotseat than this. */
export class ExportFileError extends Error {
  constructor(readonly isNewer = false) {
    super(isNewer ? "An export from a newer Hotseat" : "Not a Hotseat export")
  }
}

/** A photo kept elsewhere (a full URL) travels as it is; ids are ours, and go in the file. */
const isImageId = (image: string | null | undefined): image is string =>
  !!image && !/^https?:\/\//.test(image)

/** Every image of ours the rows point at, once. */
const getImageIds = (rows: Pick<OrganizationRows, "organization" | "offices" | "users">) => [
  ...new Set(
    [
      rows.organization.thumbnail,
      ...rows.offices.map((office) => office.thumbnail),
      ...rows.users.map((user) => user.avatarUrl),
    ].filter(isImageId)
  ),
]

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64")

const fromBase64 = (data: string) => new Uint8Array(Buffer.from(data, "base64"))

/**
 * An organization's export, as a gzipped stream: its rows first, then its
 * images one at a time (never all of them in memory at once). Null when
 * there's no such organization.
 */
export const exportOrganization =
  ({ mainRepository, imageService }: CoreContext) =>
  async (slug: string) => {
    const rows = await mainRepository.transfer.find(slug)
    if (!rows) return null

    const encoder = new TextEncoder()
    const imageIds = getImageIds(rows)
    const header = JSON.stringify({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      rows,
    })
    let nextImage = 0
    let hasImage = false

    const json = new ReadableStream<BufferSource>({
      start: (controller) => {
        // The header without its closing brace: the images follow inside it.
        controller.enqueue(encoder.encode(`${header.slice(0, -1)},"images":{`))
      },
      pull: async (controller) => {
        if (nextImage === imageIds.length) {
          controller.enqueue(encoder.encode("}}"))
          controller.close()

          return
        }

        const id = imageIds[nextImage]
        nextImage += 1
        // One that can't be read (gone from storage): left out, and its
        // place shows the fallback after the import.
        const image = await imageService.read(id).catch(() => null)
        if (!image) return

        const entry: ExportedImage = { type: image.type, data: toBase64(image.bytes) }
        const separator = hasImage ? "," : ""
        hasImage = true
        controller.enqueue(
          encoder.encode(`${separator}${JSON.stringify(id)}:${JSON.stringify(entry)}`)
        )
      },
    })

    return json.pipeThrough(new CompressionStream("gzip"))
  }

/** Gzip's first two bytes. */
const isGzip = (bytes: Uint8Array) => bytes[0] === 0x1f && bytes[1] === 0x8b

const ROW_LISTS = [
  "users",
  "profiles",
  "invites",
  "offices",
  "closedDays",
  "reservations",
  "deskReleases",
  "favoriteDesks",
  "usualDesks",
  "seatRules",
  "waitlist",
  "roomKits",
  "teams",
  "teamMembers",
  "teamZones",
  "notifications",
  "organizationRedirects",
  "officeRedirects",
] as const satisfies (keyof OrganizationRows)[]

/** An export's contents, checked to be one (gzipped or not). */
export const readExportFile = async (file: Blob): Promise<OrganizationExport> => {
  const start = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  const text = isGzip(start)
    ? await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text()
    : await file.text()

  const parsed = (() => {
    try {
      return JSON.parse(text)
    } catch {
      throw new ExportFileError()
    }
  })()

  if (parsed?.format !== EXPORT_FORMAT) throw new ExportFileError()
  if (parsed.version > EXPORT_VERSION) throw new ExportFileError(true)

  const rows = parsed.rows
  const isComplete =
    typeof rows?.organization?.slug === "string" &&
    ROW_LISTS.every((list) => Array.isArray(rows[list])) &&
    typeof parsed.images === "object"
  if (!isComplete) throw new ExportFileError()

  return parsed
}

export interface ImportOrganizationArgs {
  file: OrganizationExport
  /** Who imports it: an admin of it, whatever they were before. */
  userEmail: string
  /** Who can join (self-hosted), as on the setup screen. */
  allowedDomains: string[]
}

/**
 * A self-hosted installation set up from an export: the organization, its
 * offices, people, bookings and history, as they were. Only into an empty
 * installation (nothing to overwrite). People sign in as before, by the same
 * email.
 */
export const importOrganization =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ file, userEmail, allowedDomains }: ImportOrganizationArgs) => {
    const existing = await mainRepository.organization.findFirst()
    if (existing) throw new Error("This Hotseat is set up already")

    // Its images, kept here under new ids (one that won't keep: left out).
    const newIds = new Map<string, string>()
    for (const [id, image] of Object.entries(file.images)) {
      const newId = await imageService
        .save({ bytes: fromBase64(image.data), type: image.type })
        .catch(() => null)
      if (newId) newIds.set(id, newId)
    }

    const toNewImage = (image: string | null) =>
      isImageId(image) ? (newIds.get(image) ?? null) : image

    const { rows } = file
    const slug = rows.organization.slug
    await mainRepository.transfer.insert({
      ...rows,
      organization: {
        ...rows.organization,
        thumbnail: toNewImage(rows.organization.thumbnail),
        allowedDomains,
      },
      offices: rows.offices.map((office) => ({
        ...office,
        thumbnail: toNewImage(office.thumbnail),
      })),
      users: rows.users.map((user) => ({ ...user, avatarUrl: toNewImage(user.avatarUrl) })),
    })

    // Whoever imports it runs it here: an admin.
    const profile = await mainRepository.profile.find({ userEmail, organizationSlug: slug })
    if (!profile)
      await mainRepository.profile.create({
        email: userEmail,
        organizationSlug: slug,
        data: { role: Role.ADMIN },
      })
    else if (profile.role !== Role.ADMIN)
      await mainRepository.profile.update({
        userEmail,
        organizationSlug: slug,
        data: { role: Role.ADMIN },
      })

    return { slug }
  }
