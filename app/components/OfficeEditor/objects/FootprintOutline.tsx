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
  const amt = useRef(0)

  useFrame((state, dt) => {
    const m = mesh.current
    if (!m) return
    const target = hovered || selected ? 1 : 0
    amt.current += (target - amt.current) * Math.min(1, dt * 14)
    const a = amt.current
    m.visible = a > 0.01
    if (!m.visible) return
    // Only a hover breathes; a selection holds still.
    const breathe = hovered && !selected ? Math.sin(state.clock.elapsedTime * 4) * 0.012 : 0
    m.scale.setScalar(0.92 + 0.08 * a + breathe)
    ;(m.material as MeshBasicMaterial).opacity = (selected ? 1 : 0.8) * a
    // Keep animating under frameloop="demand" while easing or breathing (a
    // settled selection doesn't need frames).
    if (Math.abs(target - a) > 0.005 || breathe !== 0) state.invalidate()
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
const outline = (w: number, d: number) => {
  const rect = (target: Shape | Path, hw: number, hd: number, r: number) => {
    target.moveTo(-hw + r, -hd)
    target.lineTo(hw - r, -hd)
    target.quadraticCurveTo(hw, -hd, hw, -hd + r)
    target.lineTo(hw, hd - r)
    target.quadraticCurveTo(hw, hd, hw - r, hd)
    target.lineTo(-hw + r, hd)
    target.quadraticCurveTo(-hw, hd, -hw, hd - r)
    target.lineTo(-hw, -hd + r)
    target.quadraticCurveTo(-hw, -hd, -hw + r, -hd)
    return target
  }
  const r = Math.min(0.22, w / 4, d / 4)
  const shape = rect(new Shape(), w / 2, d / 2, r) as Shape
  shape.holes.push(
    rect(new Path(), w / 2 - THICK, d / 2 - THICK, Math.max(0.02, r - THICK)) as Path
  )
  return shape
}
