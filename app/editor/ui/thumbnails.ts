import { useSyncExternalStore } from "react"
import type { CatalogItem } from "../types"

/**
 * Catalog thumbnails: still images of each item (in each colour it's shown in),
 * rendered one at a time by the shared ThumbnailStudio and kept for the session.
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
  const key = getKey(type, color)
  if (images.has(key)) return

  const isQueued = queue.some((request) => request.key === key)
  if (isQueued && (!isUrgent || queue[0]?.key === key)) return

  const request = { key, type, color, isUrgent }
  const rest = queue.filter((queued) => queued.key !== key)
  queue = isUrgent ? [request, ...rest] : [...rest, request]
  notify()
}

/** Stores a rendered still and moves the queue on. */
export const addThumbnail = (key: string, url: string) => {
  images.set(key, url)
  queue = queue.filter((request) => request.key !== key)
  notify()
}

const getNextRequest = () => queue[0]

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
