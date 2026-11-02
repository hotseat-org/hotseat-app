import crypto from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { ImageService } from "./types"

/**
 * Images on the server's own disk (self-hosting: IMAGES_DIR, a volume): logos,
 * office photos, people's photos. The browser posts to a signed upload URL
 * (api/images/{id}); they're served from images/uploads/{id}. One size, as
 * uploaded (no variants).
 */
const IMAGES_DIR = process.env.IMAGES_DIR ?? ""
const SECRET = process.env.COOKIES_SECRET ?? ""
/** The app's public address, e.g. https://hotseat.acme.com (the upload URL is absolute). */
const BASE_URL = process.env.BASE_URL ?? ""

/** How long an upload URL works. */
const UPLOAD_WINDOW_MS = 10 * 60 * 1000
/** Largest image kept. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** The image types kept, by their first bytes (no SVG: it can carry scripts). */
const SIGNATURES: { type: string; matches: (bytes: Uint8Array) => boolean }[] = [
  { type: "image/png", matches: (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 },
  { type: "image/jpeg", matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 },
  { type: "image/gif", matches: (bytes) => bytes[0] === 0x47 && bytes[1] === 0x49 },
  {
    type: "image/webp",
    matches: (bytes) => bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42,
  },
]

/** An image's type from its first bytes, or null if it isn't one kept. */
export const getImageType = (bytes: Uint8Array) =>
  SIGNATURES.find((signature) => signature.matches(bytes))?.type ?? null

/** Ids are random UUIDs: anything else is never a file of ours. */
const isImageId = (id: string) => /^[0-9a-f-]{36}$/.test(id)

const sign = (id: string, expires: number) =>
  crypto.createHmac("sha256", SECRET).update(`${id}:${expires}`).digest("hex")

/** Whether an upload URL's signature is ours and still fresh. */
export const isUploadAllowed = (id: string, expires: number, signature: string) => {
  if (!isImageId(id) || !(expires > Date.now())) return false

  const expected = Buffer.from(sign(id, expires))
  const given = Buffer.from(signature)

  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

const pathOf = (id: string) => join(IMAGES_DIR, id)

/** Keep an image (checked: a kept type, not too big). */
export const saveImage = async (id: string, bytes: Uint8Array) => {
  if (!isImageId(id)) throw new Error("Not an image id")
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too big")
  if (!getImageType(bytes)) throw new Error("Not a PNG, JPEG, GIF or WebP image")

  await mkdir(IMAGES_DIR, { recursive: true })
  await writeFile(pathOf(id), bytes)
}

/** A kept image and its type, or null. */
export const readImage = async (id: string) => {
  if (!isImageId(id)) return null

  const bytes = await readFile(pathOf(id)).catch(() => null)
  const type = bytes && getImageType(bytes)

  return bytes && type ? { bytes, type } : null
}

const getUploadUrl = async () => {
  const imageId = crypto.randomUUID()
  const expires = Date.now() + UPLOAD_WINDOW_MS
  // On BASE_URL's host, under the app's base path (BASE_URL may hold it too).
  const uploadUrl = new URL(`${import.meta.env.BASE_URL}api/images/${imageId}`, BASE_URL)
  uploadUrl.searchParams.set("expires", String(expires))
  uploadUrl.searchParams.set("signature", sign(imageId, expires))

  return { imageId, uploadUrl }
}

/** Kept ids are served by the app; a full URL (a photo kept elsewhere) as it is. */
const getSignedUrl = async (id: string) =>
  /^https?:\/\//.test(id) ? id : `${import.meta.env.BASE_URL}images/uploads/${id}`

const importFromUrl = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Couldn't fetch ${url} (${response.status})`)

  const id = crypto.randomUUID()
  await saveImage(id, new Uint8Array(await response.arrayBuffer()))

  return id
}

export const localImageService: ImageService = { getUploadUrl, getSignedUrl, importFromUrl }

/** Whether this server keeps images on its own disk (IMAGES_DIR set). */
export const isLocalImageStorage = IMAGES_DIR !== ""
