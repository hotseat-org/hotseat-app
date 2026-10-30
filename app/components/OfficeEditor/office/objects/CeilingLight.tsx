import { useContext } from "react"
import { DaylightContext } from "../../daylight"
import { PALETTE } from "../../palette"
import { useLampsOn } from "../../scene/ShaderWarmup"
import { Surface } from "../../objects/Surface"

interface Props {
  color?: string
}

/** Height of the shade — well above the walls (1.4) so it reads as hanging from a ceiling. */
const SHADE_HEIGHT = 2.3
/** The cord runs up to where the (invisible) ceiling would be. */
const CORD = 0.9

/**
 * A pendant ceiling light: a cord rising out of view, a dome shade and a warm
 * glowing bulb. Lights up as the scene darkens (like the floor lamp), but casts
 * no shadows — overhead lights don't need them in this view, and shadow-casting
 * point lights cost 6 extra scene passes each.
 */
export const CeilingLight = ({ color = "#3d4657" }: Props) => {
  const nightness = useContext(DaylightContext)
  const isLampOn = useLampsOn()
  return (
    <group>
      {isLampOn && (
        <pointLight
          position={[0, SHADE_HEIGHT - 0.15, 0]}
          color="#ffe2b8"
          intensity={nightness * 7}
          distance={5.5}
          decay={2}
        />
      )}
      {/* Cord */}
      <mesh position={[0, SHADE_HEIGHT + CORD / 2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, CORD, 6]} />
        <Surface color={PALETTE.seatLeg} roughness={0.6} />
      </mesh>
      {/* Canopy fitting on the cord */}
      <mesh position={[0, SHADE_HEIGHT + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.08, 16]} />
        <Surface color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Dome shade (open underneath) */}
      <mesh position={[0, SHADE_HEIGHT - 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.26, 0.2, 28, 1, true]} />
        <Surface color={color} roughness={0.45} metalness={0.2} />
      </mesh>
      {/* Warm bulb, glowing more at night */}
      <mesh position={[0, SHADE_HEIGHT - 0.12, 0]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <Surface
          color="#fff3dc"
          emissive="#ffd9a0"
          emissiveIntensity={0.4 + nightness * 1.2}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
