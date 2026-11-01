import { useEffect, useMemo } from "react"
import { DoubleSide, EdgesGeometry, PlaneGeometry, Shape } from "three"
import { GRID, type ObjectType } from "../types"
import { getItem } from "../catalog"

interface Props {
  type: ObjectType
  x: number
  z: number
  rotation: number
  /** Red when the spot is blocked, green otherwise. */
  valid?: boolean
}

/** A flat chevron pointing +Y in its own plane (laid on the floor pointing +Z). */
const chevron = () => {
  const shape = new Shape()
  shape.moveTo(0, 0.16)
  shape.lineTo(0.2, -0.02)
  shape.lineTo(0.12, -0.08)
  shape.lineTo(0, 0.03)
  shape.lineTo(-0.12, -0.08)
  shape.lineTo(-0.2, -0.02)
  shape.closePath()

  return shape
}

/**
 * Highlights the floor an object will occupy when placed/dropped (its
 * footprint, turned with it — on the diagonal too), and
 * marks its FRONT: a bright bar along the front edge and a chevron pointing
 * out — the side people use (a desk's chair side, a sofa's seat, a TV's
 * screen), so it's clear which way it faces before rotating.
 */
export const PlacementHighlight = ({ type, x, z, rotation, valid = true }: Props) => {
  const color = valid ? "#22c55e" : "#ef4444"
  // Footprint and front marker in the piece's own (unrotated) frame: front = +Z.
  const [footprintWidth, footprintDepth] = getItem(type).footprint
  const width = footprintWidth * GRID
  const halfDepth = (footprintDepth * GRID) / 2
  const shape = useMemo(chevron, [])
  // Its outline: the footprint's edges, a pixel wide.
  const edges = useMemo(
    () => new EdgesGeometry(new PlaneGeometry(width, halfDepth * 2)),
    [width, halfDepth]
  )
  useEffect(() => () => edges.dispose(), [edges])

  return (
    <>
      <group position={[x, 0.02, z]} rotation={[0, rotation, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, halfDepth * 2]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
          <lineSegments geometry={edges}>
            <lineBasicMaterial color={color} toneMapped={false} />
          </lineSegments>
        </mesh>
      </group>
      <group position={[x, 0.024, z]} rotation={[0, rotation, 0]}>
        <mesh position={[0, 0, halfDepth - 0.03]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - 0.04, 0.06]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, halfDepth + 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  )
}
