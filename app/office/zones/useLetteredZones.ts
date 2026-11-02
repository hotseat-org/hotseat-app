import { useEffect, useMemo, useRef, useState } from "react"
import { measureNameAspect, useFontsReady } from "./ZoneLettering"
import { addLetterCells, placeZoneLetters, type ZoneLetters } from "./zoneLetters"
import { composeZoneAreas, type ZoneArea } from "./zones"
import type { SceneObject } from "~/editor/core"

/**
 * While editing, how long the layout stays still before names are placed
 * again (ms): not on every step of a drag, each costing a frame.
 */
const SETTLE = 200

/** Each layout's zones, worked out once (the zones now, and as they settled, are often one). */
const areasOf = new WeakMap<SceneObject[], ZoneArea[]>()
const getAreas = (objects: SceneObject[]) => {
  const known = areasOf.get(objects)
  if (known) return known

  const areas = composeZoneAreas(objects)
  areasOf.set(objects, areas)

  return areas
}

/** A value as it was once it stopped changing for `delay` ms (at once, with none). */
const useSettled = <Value>(value: Value, delay: number) => {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    if (delay === 0) return

    const timer = setTimeout(() => setSettled(value), delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return delay === 0 ? value : settled
}

/**
 * The zones on the floor, with their names placed (measured in the page's
 * font once it's in): each zone taking in the floor its name needs beside
 * it. A name stays where it was while it still fits there, so editing the
 * layout doesn't send names jumping round their zones.
 */
export const useLetteredZones = (objects: SceneObject[], isEditing: boolean) => {
  const isFontReady = useFontsReady()
  const areas = getAreas(objects)
  const settledObjects = useSettled(objects, isEditing ? SETTLE : 0)
  const previous = useRef<Map<string, ZoneLetters>>(undefined)
  const letters = useMemo(
    () =>
      placeZoneLetters(getAreas(settledObjects), settledObjects, {
        getAspect: measureNameAspect,
        previous: previous.current,
      }),
    // Measured again once the font is in.
    [settledObjects, isFontReady]
  )
  useEffect(() => {
    previous.current = letters
  }, [letters])

  return useMemo(() => ({ areas: addLetterCells(areas, letters), letters }), [areas, letters])
}
