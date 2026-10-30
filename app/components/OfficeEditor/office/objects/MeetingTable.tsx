import { PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { Surface } from "../../objects/Surface"
import { Bottle, Flowers, Glass, Laptop, Notebook, Papers, Pizza } from "./props"
import { look } from "./looks"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 3.6
const DEPTH = 1.5
const HEIGHT = 0.74
const TOP_THICKNESS = 0.08

/** A large meeting / dining table. */
export const MeetingTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const legOffsetX = WIDTH / 2 - 0.2
  const legOffsetZ = DEPTH / 2 - 0.2
  const legs: [number, number][] = [
    [-legOffsetX, -legOffsetZ],
    [legOffsetX, -legOffsetZ],
    [-legOffsetX, legOffsetZ],
    [legOffsetX, legOffsetZ],
  ]
  return (
    <group>
      <RoundedBox
        args={[WIDTH, TOP_THICKNESS, DEPTH]}
        radius={0.05}
        smoothness={4}
        position={[0, HEIGHT, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.55} />
      </RoundedBox>
      {legs.map(([x, z]) => (
        <RoundedBox
          key={`${x},${z}`}
          args={[0.11, HEIGHT - TOP_THICKNESS, 0.11]}
          radius={0.02}
          smoothness={3}
          position={[x, (HEIGHT - TOP_THICKNESS) / 2, z]}
          castShadow
        >
          <Surface color={PALETTE.deskLeg} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* Lived-in, one scene per look: a working lunch, a meeting, or after one */}
      {look(variant, 3) === 0 && (
        <>
          <Pizza position={[0.2, HEIGHT + TOP_THICKNESS / 2, 0]} turn={0.4} />
          <Laptop position={[-1.2, HEIGHT + TOP_THICKNESS / 2, 0.4]} turn={0.1} />
          <Laptop
            color="#3d4657"
            position={[1.1, HEIGHT + TOP_THICKNESS / 2, -0.4]}
            turn={Math.PI - 0.15}
          />
          <Notebook position={[-0.55, HEIGHT + TOP_THICKNESS / 2, 0.45]} turn={-0.2} />
          <Notebook
            color="#b96f6f"
            position={[0.5, HEIGHT + TOP_THICKNESS / 2, -0.45]}
            turn={Math.PI + 0.3}
          />
          <Bottle color="#9fc3c9" position={[-0.6, HEIGHT + TOP_THICKNESS / 2, -0.1]} />
          <Glass drink="#cfe6f0" position={[-0.8, HEIGHT + TOP_THICKNESS / 2, 0.35]} />
          <Glass drink="#cfe6f0" position={[1.3, HEIGHT + TOP_THICKNESS / 2, -0.25]} />
          <Glass position={[-0.45, HEIGHT + TOP_THICKNESS / 2, -0.05]} />
        </>
      )}
      {look(variant, 3) === 1 && (
        <>
          <Flowers position={[0, HEIGHT + TOP_THICKNESS / 2, 0]} />
          <Laptop position={[-1.1, HEIGHT + TOP_THICKNESS / 2, 0.42]} turn={0.1} />
          <Laptop color="#3d4657" position={[0.2, HEIGHT + TOP_THICKNESS / 2, 0.42]} />
          <Laptop position={[1.2, HEIGHT + TOP_THICKNESS / 2, -0.42]} turn={Math.PI} />
          <Notebook position={[-0.5, HEIGHT + TOP_THICKNESS / 2, -0.45]} turn={Math.PI + 0.2} />
          <Notebook
            color="#5f8a86"
            position={[0.8, HEIGHT + TOP_THICKNESS / 2, 0.45]}
            turn={-0.3}
          />
          <Bottle color="#9fc3c9" position={[0.5, HEIGHT + TOP_THICKNESS / 2, -0.05]} />
          <Glass drink="#cfe6f0" position={[-0.8, HEIGHT + TOP_THICKNESS / 2, 0.35]} />
          <Glass drink="#cfe6f0" position={[0.5, HEIGHT + TOP_THICKNESS / 2, 0.3]} />
          <Glass drink="#cfe6f0" position={[1.0, HEIGHT + TOP_THICKNESS / 2, -0.3]} />
        </>
      )}
      {look(variant, 3) === 2 && (
        <>
          <Bottle color="#9fc3c9" position={[0, HEIGHT + TOP_THICKNESS / 2, 0]} />
          <Glass position={[-0.25, HEIGHT + TOP_THICKNESS / 2, 0.12]} />
          <Glass position={[0.22, HEIGHT + TOP_THICKNESS / 2, -0.14]} />
          <Glass drink="#cfe6f0" position={[-1.2, HEIGHT + TOP_THICKNESS / 2, -0.35]} />
          <Papers position={[-0.8, HEIGHT + TOP_THICKNESS / 2, 0.35]} turn={0.3} />
          <Papers position={[1.1, HEIGHT + TOP_THICKNESS / 2, -0.3]} turn={Math.PI - 0.2} />
        </>
      )}
    </group>
  )
}
