import { useSyncExternalStore } from "react"
import type { CatalogItem } from "../../types"

/**
 * Catalog thumbnails: still images of each item (in each colour it's shown in),
 * rendered one at a time by the shared ThumbnailStudio — and kept between
 * visits (the browser's Cache Storage, per build): opened again, the editor
 * renders none, and nothing competes with the office loading.
 * Tiles show them instantly; only a hovered / armed tile runs a live canvas.
 */

/** A tile's preview box (CSS px): stills are rendered at exactly this size. */
export const PREVIEW_SIZE = { width: 90, height: 96 }

export interface ThumbnailRequest {
  key: string
  type: CatalogItem
  color?: string
  /** For a tile on screen (render now), not the background pre-render. */
  isUrgent: boolean
}

const getKey = (type: CatalogItem, color?: string) => `${type}|${color ?? ""}`

/** Rendered stills: key → object URL. */
const images = new Map<string, string>()
/** Waiting to be rendered, first = next. */
let queue: ThumbnailRequest[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/**
 * Asks for a still. An urgent request (a tile on screen) jumps the queue; the
 * rest (pre-rendering the whole catalog) wait their turn.
 */
export const requestThumbnail = (type: CatalogItem, color?: string, isUrgent = false) => {
  restoring ??= restoreThumbnails()
  const key = getKey(type, color)
  if (images.has(key)) return

  const isQueued = queue.some((request) => request.key === key)
  if (isQueued && (!isUrgent || queue[0]?.key === key)) return

  const request = { key, type, color, isUrgent }
  const rest = queue.filter((queued) => queued.key !== key)
  queue = isUrgent ? [request, ...rest] : [...rest, request]
  notify()
}

/** Stores a rendered still (and keeps it for later visits), and moves the queue on. */
export const addThumbnail = (key: string, blob: Blob) => {
  images.set(key, URL.createObjectURL(blob))
  void keepThumbnail(key, blob)
  queue = queue.filter((request) => request.key !== key)
  notify()
}

/** Nothing is rendered until the stills kept from earlier visits are back. */
const getNextRequest = () => (isRestored ? queue[0] : undefined)

/** Where this build's stills are kept, and the address each is kept under. */
const STORE_PREFIX = "catalog-thumbnails-"
const STORE_NAME = `${STORE_PREFIX}${__BUILD_ID__}`
const toAddress = (key: string) => `${window.location.origin}/thumbnails/${encodeURIComponent(key)}`
const fromAddress = (address: string) =>
  decodeURIComponent(new URL(address).pathname.split("/").pop() ?? "")
/** Kept between visits — not while developing (models change without a new build). */
const canKeep = () => !import.meta.env.DEV && typeof caches !== "undefined"

let isRestored = false
let restoring: Promise<void> | null = null

/** The stills kept from an earlier visit of this build (older builds' are dropped). */
const restoreThumbnails = async () => {
  try {
    if (!canKeep()) return

    for (const name of await caches.keys())
      if (name.startsWith(STORE_PREFIX) && name !== STORE_NAME) await caches.delete(name)

    const store = await caches.open(STORE_NAME)
    for (const request of await store.keys()) {
      const response = await store.match(request)
      if (response) images.set(fromAddress(request.url), URL.createObjectURL(await response.blob()))
    }
  } catch {
    // Nothing kept (storage blocked or full): they're rendered, as on a first visit.
  } finally {
    isRestored = true
    queue = queue.filter((request) => !images.has(request.key))
    notify()
  }
}

const keepThumbnail = async (key: string, blob: Blob) => {
  try {
    if (!canKeep()) return

    const store = await caches.open(STORE_NAME)
    await store.put(toAddress(key), new Response(blob, { headers: { "Content-Type": blob.type } }))
  } catch {
    // Not kept: rendered again next visit.
  }
}

/** The next still to render (for the studio). */
export const useNextThumbnailRequest = () =>
  useSyncExternalStore(subscribe, getNextRequest, () => undefined)

/** The still for an item in a colour, once rendered. */
export const useThumbnail = (type: CatalogItem, color?: string) =>
  useSyncExternalStore(
    subscribe,
    () => images.get(getKey(type, color)),
    () => undefined
  )
