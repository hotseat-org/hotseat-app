import { useLayoutEffect, useMemo, useRef } from "react"
import type { Group } from "three"
import { ObjectMesh } from "../objects/ObjectMesh"
import { GhostContext, type GhostMode } from "../objects/Surface"
import type { ObjectType } from "../types"

interface Props {
  type: ObjectType
  x?: number
  z?: number
  rotation?: number
  /** Provide to render a flat tint (erase). Omit for a translucent real-colour build ghost. */
  tint?: string
  /** Colour override for the translucent build ghost (the picked swatch). */
  color?: string
  /** Uniform scale — e.g. slightly >1 to wrap an existing object for erase. */
  scale?: number
}

/**
 * An exact-shape, translucent preview of any object type. Renders the real
 * geometry; the material style is chosen declaratively via GhostContext, so it
 * never mutates or disposes real objects' materials.
 */
export const GhostObject = ({
  type,
  x = 0,
  z = 0,
  rotation = 0,
  tint,
  color,
  scale = 1,
}: Props) => {
  const mode = useMemo<GhostMode>(() => (tint ? { tint } : "translucent"), [tint])
  // Previews never cast shadows — with cached shadow maps a ghost's shadow
  // would get baked in and linger after it moves on.
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      o.castShadow = false
    })
  })
  return (
    <GhostContext.Provider value={mode}>
      <group ref={ref} position={[x, 0, z]} rotation={[0, rotation, 0]} scale={scale}>
        <ObjectMesh type={type} color={color} />
      </group>
    </GhostContext.Provider>
  )
}
