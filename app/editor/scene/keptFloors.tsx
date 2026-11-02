import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useThree } from "@react-three/fiber"
import type { Group, Object3D } from "three"
import type { Floor } from "../floors"
import { whenQuiet } from "./whenQuiet"

/**
 * Floors once shown stay in the scene, hidden: their pieces built, baked and
 * batched. Shown again (unchanged — see showLayout), they're simply there:
 * no piece built or merged anew, which made a switch take most of a second.
 */
export const useKeptFloors = ({
  floors,
  currentFloor,
  shownPieces,
  aheadPieces,
}: {
  floors: Floor[]
  currentFloor: string
  shownPieces: ReactNode
  /** Floors not shown yet, being drawn ahead (see useFloorsAhead). */
  aheadPieces: Map<string, { node: ReactNode; isComplete: boolean }>
}) => {
  const nodes = [...aheadPieces].map(([id, { node }]) => [id, node] as const)
  const kept = useKept(new Map([[currentFloor, shownPieces], ...nodes]), (id) =>
    floors.some((floor) => floor.id === id)
  )

  return kept.map((floor) => ({
    ...floor,
    isShown: floor.key === currentFloor,
    isComplete: aheadPieces.get(floor.key)?.isComplete ?? true,
  }))
}

/** Pieces drawn ahead at each quiet moment (built and baked: a few ms each). */
const AHEAD_STEP = 8

/**
 * The floors not shown yet, drawn ahead — hidden, a few pieces at a time,
 * whenever nobody's using the page (see whenQuiet) — so even a first visit
 * finds them there (one took most of a
 * second). By floor: how many of its pieces are drawn so far. A floor once
 * shown is drawn in full (and kept, see useKeptFloors).
 */
export const useFloorsAhead = (pieceCounts: Map<string, number>, currentFloor: string) => {
  const [drawn, setDrawn] = useState(() => new Map<string, number>())
  const shown = useRef(new Set<string>())
  shown.current.add(currentFloor)

  const next = [...pieceCounts].find(
    ([id, count]) => !shown.current.has(id) && (drawn.get(id) ?? 0) < count
  )?.[0]
  useEffect(() => {
    if (!next) return

    return whenQuiet(() =>
      setDrawn((previous) => new Map(previous).set(next, (previous.get(next) ?? 0) + AHEAD_STEP))
    )
  }, [next, drawn])

  return { drawn, shownFloors: shown.current }
}

/**
 * What's drawn now, by key, and what was drawn before, kept: the shown
 * elements as they are now; the others as they were last shown (the very same
 * elements: React leaves them be), while `isKept` says so.
 */
export const useKept = (shown: Map<string, ReactNode>, isKept: (key: string) => boolean) => {
  const kept = useRef(new Map<string, ReactNode>())
  for (const [key, node] of shown) kept.current.set(key, node)
  for (const key of kept.current.keys()) if (!isKept(key)) kept.current.delete(key)

  return [...kept.current].map(([key, node]) => ({ key, node, isShown: shown.has(key) }))
}

/** Marks a kept floor that isn't shown: nothing in it can be pointed at. */
const HIDDEN_FLOOR = { isHiddenFloor: true }
const SHOWN_FLOOR = {}

/**
 * A kept floor's pieces. Hidden, out of the scene altogether (still mounted):
 * three neither draws them nor works out their matrices at every frame — a
 * floor's thousands of meshes, all of them while the floors glide.
 */
export const KeptFloor = ({
  isShown,
  isComplete = true,
  children,
}: {
  isShown: boolean
  /** All its pieces are there (a floor drawn ahead may not be yet). */
  isComplete?: boolean
  children: ReactNode
}) => {
  const self = useRef<Group>(null)
  const anchor = useRef<Group>(null)
  useLayoutEffect(() => {
    const floor = self.current
    const parent = anchor.current?.parent
    if (!floor || !parent) return

    if (!isShown) return void floor.removeFromParent()

    parent.add(floor)
    floor.updateMatrixWorld(true) // where it stands now (it wasn't kept up while out)
  }, [isShown])

  // Hidden and complete, never drawn: prepared for drawing in idle time
  // (three's work for each new mesh, and the shaders), lit as the scene is —
  // or the first frame it's shown in does it all at once.
  const { gl: renderer, scene, camera } = useThree()
  const isPrepared = useRef(false)
  useEffect(() => {
    const floor = self.current
    if (!floor || isShown || !isComplete || isPrepared.current) return

    return whenQuiet(() => {
      isPrepared.current = true
      floor.updateMatrixWorld(true)
      void renderer.compileAsync(floor, camera, scene).catch(() => {}) // prepared when drawn instead
    })
  }, [isShown, isComplete, renderer, scene, camera])
  useEffect(() => {
    if (isShown) isPrepared.current = true // drawn: prepared by now
  }, [isShown])

  return (
    <>
      {/* Where it goes back in, shown again. */}
      <group ref={anchor} />
      <group ref={self} userData={isShown ? SHOWN_FLOOR : HIDDEN_FLOOR}>
        {children}
      </group>
    </>
  )
}

/** Whether an object is on a kept floor that isn't shown. */
export const isOnHiddenFloor = (object: Object3D) => {
  for (let current: Object3D | null = object; current; current = current.parent)
    if (current.userData.isHiddenFloor) return true

  return false
}
