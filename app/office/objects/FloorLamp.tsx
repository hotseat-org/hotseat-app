import { useContext } from "react"
import { PALETTE } from "~/editor/palette"
import { DaylightContext } from "~/editor/daylight"
import { useLampsOn } from "~/editor/scene/ShaderWarmup"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

const HEIGHT = 1.6

/** A slim floor lamp: weighted base, pole and a warm glowing shade that actually
 *  casts light — brightening as the scene darkens toward night. */
export const FloorLamp = ({ color = "#f0e2c0" }: Props) => {
  const nightness = useContext(DaylightContext)
  const isLampOn = useLampsOn()

  return (
    <group>
      {/* Warm pool of light, on only as it gets dark. Casts shadows and sits just
        below the wall top (1.4) so walls occlude it instead of it spilling through
        or over them. */}
      {isLampOn && (
        <pointLight
          position={[0, 1.2, 0]}
          color="#ffd9a0"
          intensity={nightness * 9}
          distance={6}
          decay={2}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.004}
          shadow-normalBias={0.04}
          shadow-camera-near={0.15}
          shadow-camera-far={6}
        />
      )}
      {/* Base */}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.06, 24]} />
        <Surface color={PALETTE.seatLeg} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, HEIGHT, 12]} />
        <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Shade */}
      <mesh position={[0, HEIGHT - 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.24, 0.28, 24, 1, true]} />
        <Surface color={color} emissive={color} emissiveIntensity={0.5} roughness={0.6} />
      </mesh>
      {/* Warm cap so the top isn't hollow */}
      <mesh position={[0, HEIGHT + 0.11, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.02, 24]} />
        <Surface color={color} roughness={0.6} />
      </mesh>
    </group>
  )
}
