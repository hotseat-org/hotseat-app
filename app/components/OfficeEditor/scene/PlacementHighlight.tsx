import { useMemo } from "react"
import { Edges } from "@react-three/drei"
import { DoubleSide, Shape } from "three"
import { footprintCells } from "../layout"
import { FOOTPRINT_CELLS, GRID, type ObjectType } from "../types"

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
  const s = new Shape()
  s.moveTo(0, 0.16)
  s.lineTo(0.2, -0.02)
  s.lineTo(0.12, -0.08)
  s.lineTo(0, 0.03)
  s.lineTo(-0.12, -0.08)
  s.lineTo(-0.2, -0.02)
  s.closePath()
  return s
}

/**
 * Highlights the grid squares an object will occupy when placed/dropped, and
 * marks its FRONT: a bright bar along the front edge and a chevron pointing
 * out — the side people use (a desk's chair side, a sofa's seat, a TV's
 * screen), so it's clear which way it faces before rotating.
 */
export const PlacementHighlight = ({ type, x, z, rotation, valid = true }: Props) => {
  const [cx, cz] = footprintCells(type, rotation)
  const w = cx * GRID
  const d = cz * GRID
  const color = valid ? "#22c55e" : "#ef4444"
  // Front marker in the piece's own (unrotated) frame: front = +Z.
  const [fw, fd] = FOOTPRINT_CELLS[type]
  const width = fw * GRID
  const halfDepth = (fd * GRID) / 2
  const shape = useMemo(chevron, [])

  return (
    <>
      <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
        <Edges color={color} />
      </mesh>
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
