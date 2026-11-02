import { Flowers, Papers } from "../props"
import { Seat } from "../seating/Seat"
import { DESK, PALETTE } from "~/editor/core"
import { RoundedBox, Surface } from "~/editor/kit"

interface Props {
  /** The counter's front. */
  color?: string
}

const WIDTH = 2.6
const COUNTER = 1.05
const PANEL = 0.08
/** The front panel's face (visitors come from the front, +Z). */
const FRONT = 0.5
/** The work top behind it, where whoever's at reception sits. */
const WORK_DEPTH = 0.7
const DARK = "#2c313c"

/**
 * A reception desk: a tall front with a ledge for visitors, a work top and a
 * chair behind it, a screen facing in — a bell, flowers and the visitors' book on the ledge.
 */
export const ReceptionDesk = ({ color = "#f3ead8" }: Props) => (
  <group>
    {/* Front panel, a band across it, and the two ends */}
    <RoundedBox
      args={[WIDTH, COUNTER, PANEL]}
      radius={0.02}
      smoothness={2}
      position={[0, COUNTER / 2, FRONT - PANEL / 2]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.6} />
    </RoundedBox>
    <mesh position={[0, COUNTER * 0.62, FRONT + 0.002]}>
      <boxGeometry args={[WIDTH - 0.3, 0.1, 0.004]} />
      <Surface color={PALETTE.deskTop} roughness={0.5} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh
        key={side}
        position={[side * (WIDTH / 2 - PANEL / 2), COUNTER / 2, FRONT - PANEL - WORK_DEPTH / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[PANEL, COUNTER, WORK_DEPTH]} />
        <Surface color={color} roughness={0.6} />
      </mesh>
    ))}
    {/* Ledge on top of the front */}
    <mesh position={[0, COUNTER + 0.02, FRONT - 0.14]} castShadow receiveShadow>
      <boxGeometry args={[WIDTH + 0.06, 0.04, 0.32]} />
      <Surface color={PALETTE.deskTop} roughness={0.5} />
    </mesh>
    {/* Work top */}
    <mesh
      position={[0, DESK.height - 0.02, FRONT - PANEL - WORK_DEPTH / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[WIDTH - PANEL * 2, 0.04, WORK_DEPTH]} />
      <Surface color={PALETTE.deskTop} roughness={0.5} />
    </mesh>
    {/* Screen, facing whoever sits behind */}
    <group position={[-0.5, DESK.height, FRONT - PANEL - 0.18]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.1, 0.03]}>
        <boxGeometry args={[0.05, 0.2, 0.04]} />
        <Surface color={DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.56, 0.32, 0.03]} />
        <Surface color={DARK} roughness={0.4} />
      </mesh>
    </group>
    <Papers position={[0.4, DESK.height, FRONT - PANEL - 0.3]} />
    {/* On the ledge: a bell, flowers, the visitors' book */}
    <group position={[0, COUNTER + 0.04, FRONT - 0.14]}>
      <mesh position={[0.55, 0.03, 0]} castShadow>
        <sphereGeometry args={[0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Surface color="#e8c07a" roughness={0.25} metalness={0.8} />
      </mesh>
      <mesh position={[0.55, 0.012, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.024, 14]} />
        <Surface color={DARK} roughness={0.5} />
      </mesh>
      <Flowers position={[-0.95, 0, 0]} />
      <mesh position={[0.1, 0.012, 0.02]} rotation={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.32, 0.024, 0.22]} />
        <Surface color="#5f8a86" roughness={0.7} />
      </mesh>
    </group>
    <group position={[-0.2, 0, -0.42]}>
      <Seat />
    </group>
  </group>
)
