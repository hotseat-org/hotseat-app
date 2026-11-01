import { useLayoutEffect, useRef, type ReactNode } from "react"
import type { Group, Object3D } from "three"
import type { Floor } from "../floors"

/**
 * Floors once shown stay in the scene, hidden: their pieces built, baked and
 * batched. Shown again (unchanged — see showLayout), they're simply there:
 * no piece built or merged anew, which made a switch take most of a second.
 */
export const useKeptFloors = (floors: Floor[], currentFloor: string, shownPieces: ReactNode) =>
  useKept(new Map([[currentFloor, shownPieces]]), (id) => floors.some((floor) => floor.id === id))

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
export const KeptFloor = ({ isShown, children }: { isShown: boolean; children: ReactNode }) => {
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
