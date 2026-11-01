import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import {
  Color,
  ExtrudeGeometry,
  Path,
  Shape,
  type Group,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three"
import { ACCENT } from "../palette"

/** How far the plinth reaches past the footprint, how thick it is, and its rim's width (m). */
const MARGIN = 0.08
const THICKNESS = 0.045
const RIM = 0.025
/** How far its contact shadow spreads past it (m). */
const SHADOW_SPREAD = 0.05

/**
 * Its looks: a cream slab pointed at, an accent one (glowing a little, with
 * a crisp rim) selected. Neither shares a hue with a zone's tint, and both
 * are solid: a zone is a wash of colour on the floor, this a thing on it.
 */
const LOOK = {
  hovered: { color: new Color("#efe5d2"), glow: 0, rim: 0 },
  selected: { color: new Color(ACCENT), glow: 0.25, rim: 1 },
}

/**
 * The one visual language for "clickable" and "selected", in both modes: a
 * solid, lit plinth the piece stands on, tracing its footprint (a rounded
 * rectangle, so in a tight desk pod it marks exactly THIS desk), with a soft
 * contact shadow round its foot.
 *  - hovered  → cream ("you can click this")
 *  - selected → accent, with a crisp rim round its top
 * Eases in (grow + fade from clear to solid) and out — animated per frame,
 * no React re-renders.
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
  const shadow = useMemo(
    () =>
      roundedRect(
        new Shape(),
        outerWidth + SHADOW_SPREAD * 2,
        outerDepth + SHADOW_SPREAD * 2
      ) as Shape,
    [outerWidth, outerDepth]
  )
  const group = useRef<Group>(null)
  const slabMaterial = useRef<MeshStandardMaterial>(null)
  const rimMaterial = useRef<MeshBasicMaterial>(null)
  const shadowMaterial = useRef<MeshBasicMaterial>(null)
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
    const slabSurface = slabMaterial.current
    if (slabSurface) {
      slabSurface.color.copy(look.color)
      slabSurface.emissive.copy(look.color)
      slabSurface.emissiveIntensity = look.glow
      slabSurface.opacity = strength
      // Solid once in: it hides what's under it, like the furniture does.
      slabSurface.depthWrite = strength > 0.95
    }
    if (rimMaterial.current) rimMaterial.current.opacity = look.rim * strength
    if (shadowMaterial.current) shadowMaterial.current.opacity = 0.28 * strength
    // Keep animating under frameloop="demand" while easing (a settled one needs no frames).
    if (Math.abs(target - strength) > 0.005) state.invalidate()
  })

  return (
    <group ref={group} visible={false}>
      {/* A soft contact shadow round its foot: it stands on the floor, not in it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position-y={0.004}>
        <shapeGeometry args={[shadow, 8]} />
        <meshBasicMaterial
          ref={shadowMaterial}
          color="#000000"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* The slab, extruded up from the floor and lit like the furniture. */}
      <mesh geometry={slab} rotation={[-Math.PI / 2, 0, 0]} position-y={0.005}>
        <meshStandardMaterial
          ref={slabMaterial}
          roughness={0.55}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {/* The rim round its top (selected). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position-y={THICKNESS + 0.008} renderOrder={2}>
        <shapeGeometry args={[rim, 8]} />
        <meshBasicMaterial
          ref={rimMaterial}
          color="#e9fbff"
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
