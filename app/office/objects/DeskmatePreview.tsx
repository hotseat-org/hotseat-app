import { Desk } from "./Desk"
import { Seat } from "./Seat"
import { Model } from "~/editor/objects/Model"
import { SEAT } from "~/editor/objects/dimensions"

/**
 * Static stand-in for a deskmate: the real component floats a drei <Html> name
 * tag and runs wiggle timers, neither of which belongs in a thumbnail. Mirrors
 * Deskmate's layout with a still animal so the type stays recognisable.
 */
export const DeskmatePreview = ({ color }: { color?: string }) => (
  <group>
    <group position={[0, 0, -0.35]}>
      <Desk color={color} />
    </group>
    <group position={[0, 0, 0.4]} rotation={[0, Math.PI, 0]}>
      <Seat />
    </group>
    <group position={[0, SEAT.seatHeight + 0.06, 0.4]} rotation={[0, Math.PI, 0]}>
      <Model url={`${import.meta.env.BASE_URL}models/animal-cat.glb`} scale={0.4} />
    </group>
  </group>
)
