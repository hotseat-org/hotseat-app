import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"
import { look } from "./looks"

interface Props {
  /** Planter colour. */
  color?: string
  variant?: number
}

const W = 1.9
const D = 0.42
const H = 0.45

/**
 * A long planter box — a soft room divider. Its look picks the planting:
 * bushy shrubs, tall grasses, or shrubs with flowers.
 */
export const PlanterBox = ({ color = "#8f9aa6", variant }: Props) => {
  const v = look(variant, 3)
  const xs = [-0.72, -0.36, 0, 0.36, 0.72]
  return (
    <group>
      <RoundedBox
        args={[W, H, D]}
        radius={0.03}
        smoothness={3}
        position={[0, H / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, H + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.06, D - 0.06]} />
        <Surface color="#5b463a" roughness={1} />
      </mesh>
      {v !== 1 &&
        xs.map((x, i) => (
          <mesh
            key={x}
            position={[x, H + 0.16 + (i % 2) * 0.04, (i % 2 ? 1 : -1) * 0.03]}
            castShadow
          >
            <icosahedronGeometry args={[0.2 + (i % 2) * 0.03, 1]} />
            <Surface
              color={i % 2 ? PALETTE.plantLeafDark : PALETTE.plantLeaf}
              roughness={0.9}
              flatShading
            />
          </mesh>
        ))}
      {v === 1 &&
        [...xs, -0.54, -0.18, 0.18, 0.54].map((x, i) => (
          <mesh
            key={x}
            position={[x, H + 0.3 + (i % 3) * 0.06, (i % 2 ? 1 : -1) * 0.06]}
            rotation={[0, 0, (i % 3) * 0.08 - 0.08]}
            castShadow
          >
            <coneGeometry args={[0.07, 0.6 + (i % 3) * 0.12, 5]} />
            <Surface
              color={i % 2 ? "#8fae6a" : PALETTE.plantLeafDark}
              roughness={0.9}
              flatShading
            />
          </mesh>
        ))}
      {v === 2 &&
        [-0.6, -0.15, 0.3, 0.68].map((x, i) => (
          <mesh key={x} position={[x, H + 0.34, (i % 2 ? -1 : 1) * 0.08]} castShadow>
            <icosahedronGeometry args={[0.045, 0]} />
            <Surface
              color={["#e9876a", "#f3f1ec", "#e8c07a", "#b96f6f"][i]}
              roughness={0.7}
              flatShading
            />
          </mesh>
        ))}
    </group>
  )
}
