import { PALETTE } from "../palette"
import { Croissant, Cutlery, Flowers, Glass, Laptop, Mug, Notebook, Plate, Pot } from "./props"
import { look } from "./looks"
import { FLUSH_INSET } from "./dimensions"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const RADIUS = 0.66
const HEIGHT = 0.74

/** A round meeting table for four on a single pedestal with a cross base. */
export const RoundTable = ({ color = PALETTE.deskTop, variant }: Props) => (
  <group>
    <mesh position={[0, HEIGHT - 0.03, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[RADIUS, RADIUS, 0.06, 40]} />
      <Surface color={color} roughness={0.55} />
    </mesh>
    <mesh position={[0, (HEIGHT - 0.06) / 2, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.07, HEIGHT - 0.06, 16]} />
      <Surface color={PALETTE.deskLeg} roughness={0.6} />
    </mesh>
    {[0, Math.PI / 2].map((rotation) => (
      <mesh
        key={rotation}
        // The second bar a hair lower: crossing at one height, their tops
        // would share a plane where they meet (FLUSH_INSET).
        position={[0, rotation ? 0.03 - FLUSH_INSET : 0.03, 0]}
        rotation={[0, rotation + Math.PI / 4, 0]}
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
        <Pot position={[0, HEIGHT, 0]} />
        {(["pasta", "salad", "curry", "steak"] as const).map((food, i) => {
          const angle = Math.PI / 4 + (i * Math.PI) / 2
          const getPosition = (radius: number): [number, number, number] => [
            Math.sin(angle) * radius,
            HEIGHT,
            Math.cos(angle) * radius,
          ]
          return (
            <group key={food}>
              <Plate food={food} hot={i % 2 === 0} position={getPosition(0.44)} />
              <Cutlery
                position={[
                  getPosition(0.44)[0] + Math.cos(angle) * 0.16,
                  HEIGHT,
                  getPosition(0.44)[2] - Math.sin(angle) * 0.16,
                ]}
                turn={angle}
              />
              <Glass
                drink={i === 1 ? "#9e3b3b" : "#cfe6f0"}
                position={[
                  getPosition(0.36)[0] - Math.cos(angle) * 0.17,
                  HEIGHT,
                  getPosition(0.36)[2] + Math.sin(angle) * 0.17,
                ]}
              />
            </group>
          )
        })}
      </>
    )}
    {look(variant, 3) === 1 && (
      <>
        <Flowers position={[0, HEIGHT, 0]} />
        {[0, 1, 2].map((i) => {
          const angle = 0.4 + (i * Math.PI * 2) / 3
          return (
            <group key={i}>
              <Plate position={[Math.sin(angle) * 0.42, HEIGHT, Math.cos(angle) * 0.42]} />
              <Croissant
                position={[Math.sin(angle) * 0.42, HEIGHT + 0.016, Math.cos(angle) * 0.42]}
                turn={angle}
              />
              <Mug
                color={["#f3f1ec", "#e9876a", "#6d90c9"][i]}
                position={[Math.sin(angle + 0.45) * 0.4, HEIGHT, Math.cos(angle + 0.45) * 0.4]}
                turn={angle}
              />
            </group>
          )
        })}
      </>
    )}
    {look(variant, 3) === 2 && (
      <>
        <Flowers vase="#f3f1ec" position={[0, HEIGHT, 0]} />
        <Laptop position={[0.1, HEIGHT, 0.36]} turn={0.2} />
        <Notebook position={[-0.4, HEIGHT, -0.12]} turn={Math.PI / 2 + 0.3} />
        <Notebook color="#5f8a86" position={[0.36, HEIGHT, -0.28]} turn={Math.PI - 0.5} />
        <Glass drink="#cfe6f0" position={[-0.3, HEIGHT, 0.3]} />
        <Glass drink="#cfe6f0" position={[0.18, HEIGHT, -0.42]} />
      </>
    )}
  </group>
)
