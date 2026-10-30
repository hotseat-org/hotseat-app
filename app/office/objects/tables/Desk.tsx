import { Books, Flowers, Mug, Notebook, Papers, PenCup, StickyNote, Succulent } from "../props"
import { look } from "../looks"
import { ACCENT, PALETTE } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"
import { DESK } from "~/editor/objects/dimensions"

interface Props {
  color?: string
  variant?: number
  /** Someone's here (lived-in, monitor on); false = free (clean, monitor off). */
  occupied?: boolean
}

const TOP = DESK.height + DESK.topThickness / 2
/** Spots on the desktop: back-left, back-right, right, front-left. */
const BACK_LEFT: [number, number, number] = [-0.62, TOP, -0.26]
const BACK_RIGHT: [number, number, number] = [0.64, TOP, -0.28]
const RIGHT: [number, number, number] = [0.52, TOP, -0.06]
const FRONT_LEFT: [number, number, number] = [-0.6, TOP, 0.12]

/** The clutter of an occupied desk, one arrangement per look. */
const Clutter = ({ look }: { look: number }) => {
  switch (look) {
    case 0:
      return (
        <>
          <Papers position={RIGHT} turn={0.2} />
          <PenCup position={BACK_LEFT} />
          <Succulent position={BACK_RIGHT} />
          <StickyNote position={[0.27, DESK.height + 0.56, -DESK.depth / 2 + 0.185]} />
          <StickyNote
            color="#f5a7b8"
            position={[0.27, DESK.height + 0.47, -DESK.depth / 2 + 0.185]}
          />
        </>
      )
    case 1:
      return (
        <>
          <Mug color="#6d90c9" position={FRONT_LEFT} turn={2.4} />
          <Books colors={["#5f8a86", "#e8c07a"]} position={BACK_LEFT} turn={0.2} />
          <Notebook position={RIGHT} turn={-0.3} />
          <Succulent pot="#f3f1ec" position={BACK_RIGHT} />
        </>
      )
    case 2:
      return (
        <>
          <Papers position={RIGHT} turn={-0.15} />
          <Mug color="#e9876a" position={FRONT_LEFT} turn={0.8} />
          <Flowers vase="#f3f1ec" position={BACK_RIGHT} />
          <StickyNote
            color="#9fd6c2"
            position={[-0.27, DESK.height + 0.56, -DESK.depth / 2 + 0.185]}
          />
        </>
      )
    default:
      return (
        <>
          <Notebook color="#b96f6f" position={RIGHT} turn={0.25} />
          <PenCup color="#e8c07a" position={BACK_RIGHT} />
          <Mug position={FRONT_LEFT} turn={1.4} />
        </>
      )
  }
}

/** Rounded desktop on four legs, with a little side cabinet and a monitor. */
export const Desk = ({ color = PALETTE.deskTop, variant, occupied }: Props) => {
  const inUse = occupied !== false
  const legY = (DESK.height - DESK.topThickness) / 2
  const legOffsetX = DESK.width / 2 - DESK.legThickness / 2 - 0.05
  const legOffsetZ = DESK.depth / 2 - DESK.legThickness / 2 - 0.05
  const legs: [number, number][] = [
    [-legOffsetX, -legOffsetZ],
    [legOffsetX, -legOffsetZ],
    [-legOffsetX, legOffsetZ],
    [legOffsetX, legOffsetZ],
  ]

  return (
    <group>
      {/* Top */}
      <RoundedBox
        args={[DESK.width, DESK.topThickness, DESK.depth]}
        radius={0.03}
        smoothness={4}
        position={[0, DESK.height, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.6} />
      </RoundedBox>

      {/* Legs */}
      {legs.map(([x, z]) => (
        <RoundedBox
          key={`${x},${z}`}
          args={[DESK.legThickness, DESK.height - DESK.topThickness, DESK.legThickness]}
          radius={0.02}
          smoothness={3}
          position={[x, legY, z]}
          castShadow
        >
          <Surface color={PALETTE.deskLeg} roughness={0.7} />
        </RoundedBox>
      ))}

      {/* Side cabinet */}
      <RoundedBox
        args={[0.4, DESK.height - 0.18, DESK.depth - 0.18]}
        radius={0.03}
        smoothness={4}
        position={[DESK.width / 2 - 0.28, (DESK.height - 0.18) / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={PALETTE.deskLeg} roughness={0.7} />
      </RoundedBox>

      {/* Monitor: stand + a subtly glowing screen (the hint of outrun) */}
      <mesh position={[0, DESK.height + 0.12, -DESK.depth / 2 + 0.18]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.24, 16]} />
        <Surface color={PALETTE.seatLeg} roughness={0.5} metalness={0.2} />
      </mesh>
      <RoundedBox
        args={[0.66, 0.4, 0.04]}
        radius={0.02}
        smoothness={4}
        position={[0, DESK.height + 0.44, -DESK.depth / 2 + 0.16]}
        castShadow
      >
        {inUse ? (
          <Surface color={ACCENT} emissive={ACCENT} emissiveIntensity={0.9} roughness={0.4} />
        ) : (
          // Off: a dark, glossy screen.
          <Surface color="#2c313c" roughness={0.3} metalness={0.2} />
        )}
      </RoundedBox>

      {/* Keyboard */}
      <RoundedBox
        args={[0.44, 0.025, 0.16]}
        radius={0.008}
        smoothness={3}
        position={[-0.05, DESK.height + 0.055, 0.12]}
        castShadow
      >
        <Surface color={PALETTE.seatLeg} roughness={0.6} />
      </RoundedBox>
      {/* Keys plate */}
      <mesh position={[-0.05, DESK.height + 0.07, 0.12]}>
        <boxGeometry args={[0.4, 0.006, 0.12]} />
        <Surface color="#5b6577" roughness={0.7} />
      </mesh>
      {/* Mouse */}
      <RoundedBox
        args={[0.06, 0.028, 0.095]}
        radius={0.025}
        smoothness={3}
        position={[0.28, DESK.height + 0.055, 0.12]}
        castShadow
      >
        <Surface color={PALETTE.seatLeg} roughness={0.6} />
      </RoundedBox>
      {/* Lived-in when someone's here; a free desk is left clean. */}
      {inUse && <Clutter look={look(variant, 4)} />}
    </group>
  )
}
