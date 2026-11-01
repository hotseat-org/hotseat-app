import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { ExtrudeGeometry, Path, Shape, type Group, type MeshBasicMaterial } from "three"
import { ACCENT } from "../palette"

/** How far the plinth reaches past the footprint, how thick it is, and its rim's width (m). */
const MARGIN = 0.08
const THICKNESS = 0.03
const RIM = 0.03

/** How strong each part shows: pointed at, and selected (0–1 opacity). */
const LOOK = {
  hovered: { top: 0.3, side: 0.45, rim: 0 },
  selected: { top: 0.5, side: 0.85, rim: 1 },
}

/**
 * The one visual language for "clickable" and "selected", in both modes: a
 * thin tinted plinth the piece stands on, tracing its footprint (a rounded
 * rectangle, so in a tight desk pod it marks exactly THIS desk).
 *  - hovered  → a light, see-through slab ("you can click this")
 *  - selected → a solid one, a crisp rim round its top
 * Eases in (grow + fade) and out — animated per frame, no React re-renders.
 * Brand cyan with tone mapping off, so it catches a hint of bloom in view mode.
 */
export const FootprintPlinth = ({
  width,
  depth,
  hovered,
  selected = false,
}: {
  /** Footprint size in the object's local (unrotated) axes. */
  width: number
  depth: number
  hovered: boolean
  selected?: boolean
}) => {
  const outerWidth = width + MARGIN * 2
  const outerDepth = depth + MARGIN * 2
  const slab = useMemo(
    () =>
      new ExtrudeGeometry(roundedRect(new Shape(), outerWidth, outerDepth) as Shape, {
        depth: THICKNESS,
        bevelEnabled: false,
        curveSegments: 8,
      }),
    [outerWidth, outerDepth]
  )
  useEffect(() => () => slab.dispose(), [slab])
  const rim = useMemo(() => {
    const band = roundedRect(new Shape(), outerWidth, outerDepth) as Shape
    band.holes.push(roundedRect(new Path(), outerWidth - RIM * 2, outerDepth - RIM * 2) as Path)

    return band
  }, [outerWidth, outerDepth])
  const group = useRef<Group>(null)
  const materials = useRef<{
    top: MeshBasicMaterial | null
    side: MeshBasicMaterial | null
    rim: MeshBasicMaterial | null
  }>({ top: null, side: null, rim: null })
  const amount = useRef(0)

  useFrame((state, delta) => {
    const plinth = group.current
    if (!plinth) return

    const target = hovered || selected ? 1 : 0
    amount.current += (target - amount.current) * Math.min(1, delta * 14)
    const strength = amount.current
    plinth.visible = strength > 0.01
    if (!plinth.visible) return

    plinth.scale.set(0.94 + 0.06 * strength, 1, 0.94 + 0.06 * strength)
    const look = selected ? LOOK.selected : LOOK.hovered
    const { top, side, rim: rimMaterial } = materials.current
    if (top) top.opacity = look.top * strength
    if (side) side.opacity = look.side * strength
    if (rimMaterial) rimMaterial.opacity = look.rim * strength
    // Keep animating under frameloop="demand" while easing (a settled one needs no frames).
    if (Math.abs(target - strength) > 0.005) state.invalidate()
  })

  return (
    <group ref={group} visible={false}>
      {/* The slab: extruded up from the floor (its caps the top, its sides the edge). */}
      <mesh geometry={slab} rotation={[-Math.PI / 2, 0, 0]} position-y={0.002} renderOrder={1}>
        <meshBasicMaterial
          ref={(material) => {
            materials.current.top = material
          }}
          attach="material-0"
          color={ACCENT}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
        <meshBasicMaterial
          ref={(material) => {
            materials.current.side = material
          }}
          attach="material-1"
          color={ACCENT}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* The rim round its top (selected). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position-y={THICKNESS + 0.004} renderOrder={2}>
        <shapeGeometry args={[rim, 8]} />
        <meshBasicMaterial
          ref={(material) => {
            materials.current.rim = material
          }}
          color="#d9f6ff"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/** A rounded rectangle (w × d) centred on the origin, traced into `target`. */
const roundedRect = (target: Shape | Path, rectWidth: number, rectDepth: number) => {
  const halfWidth = rectWidth / 2
  const halfDepth = rectDepth / 2
  const radius = Math.min(0.18, rectWidth / 4, rectDepth / 4)
  target.moveTo(-halfWidth + radius, -halfDepth)
  target.lineTo(halfWidth - radius, -halfDepth)
  target.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + radius)
  target.lineTo(halfWidth, halfDepth - radius)
  target.quadraticCurveTo(halfWidth, halfDepth, halfWidth - radius, halfDepth)
  target.lineTo(-halfWidth + radius, halfDepth)
  target.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - radius)
  target.lineTo(-halfWidth, -halfDepth + radius)
  target.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + radius, -halfDepth)

  return target
}
