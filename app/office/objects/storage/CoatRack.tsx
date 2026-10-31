import { look } from "../looks"
import { PALETTE } from "~/editor/core"
import { RoundedBox, Surface } from "~/editor/kit"

interface Props {
  color?: string
  variant?: number
}

const HEIGHT = 1.45

/** What hangs on it per look: coats (colours) and maybe a scarf. */
const LOOKS: { coats: string[]; scarf?: string }[] = [
  { coats: ["#3d4657", "#c0876a"], scarf: "#e8c07a" },
  { coats: ["#5f8a86"] },
  { coats: ["#b96f6f", "#6d90c9"], scarf: "#f3e4d0" },
]

/** A standing coat rack with coats hung on its hooks. */
export const CoatRack = ({ color = PALETTE.deskLeg, variant }: Props) => {
  const outfit = LOOKS[look(variant, LOOKS.length)]

  return (
    <group>
      <mesh position={[0, HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, HEIGHT, 10]} />
        <Surface color={color} roughness={0.6} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 0.03, 0]}
          rotation={[0, (i * Math.PI * 2) / 3, Math.PI / 2 - 0.25]}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.018, 0.34, 8]} />
          <Surface color={color} roughness={0.6} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin((i * Math.PI) / 2) * 0.06,
            HEIGHT - 0.08,
            Math.cos((i * Math.PI) / 2) * 0.06,
          ]}
          rotation={[Math.cos((i * Math.PI) / 2) * 0.7, 0, -Math.sin((i * Math.PI) / 2) * 0.7]}
        >
          <cylinderGeometry args={[0.01, 0.01, 0.14, 6]} />
          <Surface color={color} roughness={0.6} />
        </mesh>
      ))}
      {outfit.coats.map((coatColor, i) => {
        const angle = i === 0 ? 0 : Math.PI / 2

        return (
          <group key={i} rotation={[0, angle, 0]} position={[0, 0, 0]}>
            <RoundedBox
              args={[0.3, 0.62, 0.1]}
              radius={0.04}
              smoothness={2}
              position={[0, HEIGHT - 0.42, 0.1]}
              rotation={[0.08, 0, 0]}
              castShadow
            >
              <Surface color={coatColor} roughness={0.95} />
            </RoundedBox>
          </group>
        )
      })}
      {outfit.scarf && (
        <mesh position={[0.1, HEIGHT - 0.28, -0.05]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.06, 0.4, 0.03]} />
          <Surface color={outfit.scarf} roughness={1} />
        </mesh>
      )}
    </group>
  )
}
