import { PALETTE } from "../palette"
import { Croissant, Cutlery, Flowers, Glass, Laptop, Mug, Notebook, Plate, Pot } from "./props"
import { look } from "./looks"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const R = 0.66
const H = 0.74

/** A round meeting table for four on a single pedestal with a cross base. */
export const RoundTable = ({ color = PALETTE.deskTop, variant }: Props) => (
  <group>
    <mesh position={[0, H - 0.03, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[R, R, 0.06, 40]} />
      <Surface color={color} roughness={0.55} />
    </mesh>
    <mesh position={[0, (H - 0.06) / 2, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.07, H - 0.06, 16]} />
      <Surface color={PALETTE.deskLeg} roughness={0.6} />
    </mesh>
    {[0, Math.PI / 2].map((r) => (
      <mesh
        key={r}
        position={[0, 0.03, 0]}
        rotation={[0, r + Math.PI / 4, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.9, 0.05, 0.08]} />
        <Surface color={PALETTE.deskLeg} roughness={0.6} />
      </mesh>
    ))}
    {/* Lived-in, one scene per look: lunch, coffee and cake, or a meeting */}
    {look(variant, 3) === 0 && (
      <>
        <Pot position={[0, H, 0]} />
        {(["pasta", "salad", "curry", "steak"] as const).map((food, i) => {
          const a = Math.PI / 4 + (i * Math.PI) / 2
          const at = (r: number): [number, number, number] => [Math.sin(a) * r, H, Math.cos(a) * r]
          return (
            <group key={food}>
              <Plate food={food} hot={i % 2 === 0} position={at(0.44)} />
              <Cutlery
                position={[at(0.44)[0] + Math.cos(a) * 0.16, H, at(0.44)[2] - Math.sin(a) * 0.16]}
                turn={a}
              />
              <Glass
                drink={i === 1 ? "#9e3b3b" : "#cfe6f0"}
                position={[at(0.36)[0] - Math.cos(a) * 0.17, H, at(0.36)[2] + Math.sin(a) * 0.17]}
              />
            </group>
          )
        })}
      </>
    )}
    {look(variant, 3) === 1 && (
      <>
        <Flowers position={[0, H, 0]} />
        {[0, 1, 2].map((i) => {
          const a = 0.4 + (i * Math.PI * 2) / 3
          return (
            <group key={i}>
              <Plate position={[Math.sin(a) * 0.42, H, Math.cos(a) * 0.42]} />
              <Croissant position={[Math.sin(a) * 0.42, H + 0.016, Math.cos(a) * 0.42]} turn={a} />
              <Mug
                color={["#f3f1ec", "#e9876a", "#6d90c9"][i]}
                position={[Math.sin(a + 0.45) * 0.4, H, Math.cos(a + 0.45) * 0.4]}
                turn={a}
              />
            </group>
          )
        })}
      </>
    )}
    {look(variant, 3) === 2 && (
      <>
        <Flowers vase="#f3f1ec" position={[0, H, 0]} />
        <Laptop position={[0.1, H, 0.36]} turn={0.2} />
        <Notebook position={[-0.4, H, -0.12]} turn={Math.PI / 2 + 0.3} />
        <Notebook color="#5f8a86" position={[0.36, H, -0.28]} turn={Math.PI - 0.5} />
        <Glass drink="#cfe6f0" position={[-0.3, H, 0.3]} />
        <Glass drink="#cfe6f0" position={[0.18, H, -0.42]} />
      </>
    )}
  </group>
)
