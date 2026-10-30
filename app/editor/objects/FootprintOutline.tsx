import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { Path, Shape, type Mesh, type MeshBasicMaterial } from "three"
import { ACCENT } from "../palette"

/**
 * The one visual language for "clickable" and "selected", in both modes: a
 * glowing outline on the floor tracing the object's footprint (a rounded
 * rectangle, so in a tight desk pod it marks exactly THIS desk).
 *  - hovered  → eases in and breathes gently ("you can click this")
 *  - selected → steady, full strength
 * Eases out when neither. Eases in (grow + fade), breathes gently while hovered, and
 * eases out — animated per frame, no React re-renders. Brand cyan with tone
 * mapping off, so it catches a hint of bloom in view mode.
 */
export const FootprintOutline = ({
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
  const shape = useMemo(() => outline(width + MARGIN * 2, depth + MARGIN * 2), [width, depth])
  const mesh = useRef<Mesh>(null)
  const amount = useRef(0)

  useFrame((state, delta) => {
    const outlineMesh = mesh.current
    if (!outlineMesh) return

    const target = hovered || selected ? 1 : 0
    amount.current += (target - amount.current) * Math.min(1, delta * 14)
    const strength = amount.current
    outlineMesh.visible = strength > 0.01
    if (!outlineMesh.visible) return

    // Only a hover breathes; a selection holds still.
    const breathe = hovered && !selected ? Math.sin(state.clock.elapsedTime * 4) * 0.012 : 0
    outlineMesh.scale.setScalar(0.92 + 0.08 * strength + breathe)
    ;(outlineMesh.material as MeshBasicMaterial).opacity = (selected ? 1 : 0.8) * strength
    // Keep animating under frameloop="demand" while easing or breathing (a
    // settled selection doesn't need frames).
    if (Math.abs(target - strength) > 0.005 || breathe !== 0) state.invalidate()
  })

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} visible={false}>
      <shapeGeometry args={[shape, 12]} />
      <meshBasicMaterial
        color={ACCENT}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Gap between the footprint and the outline, and the outline's thickness. */
const MARGIN = 0.06
const THICK = 0.06

/** A rounded-rectangle band (w × d outer size) centred on the origin. */
const outline = (outlineWidth: number, outlineDepth: number) => {
  const rect = (target: Shape | Path, halfWidth: number, halfDepth: number, radius: number) => {
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
  const cornerRadius = Math.min(0.22, outlineWidth / 4, outlineDepth / 4)
  const shape = rect(new Shape(), outlineWidth / 2, outlineDepth / 2, cornerRadius) as Shape
  shape.holes.push(
    rect(
      new Path(),
      outlineWidth / 2 - THICK,
      outlineDepth / 2 - THICK,
      Math.max(0.02, cornerRadius - THICK)
    ) as Path
  )

  return shape
}
