import { Seat } from "../seating/Seat"
import { Desk } from "./Desk"
import { WORKSTATION_SEAT_Z } from "~/editor/core"

interface Props {
  color?: string
  variant?: number
  occupied?: boolean
}

/**
 * A full workstation: a full-size desk with its chair tucked underneath (seat
 * slides under the desktop, backrest clearing the front edge). Footprint 4×3
 * squares (2.0 × 1.5 m).
 */
export const Workstation = ({ color, variant, occupied }: Props) => (
  <group>
    <group position={[0, 0, -0.25]}>
      <Desk color={color} variant={variant} occupied={occupied} />
    </group>
    {/* Chair faces the desk: tucked under the desktop, or pulled out when
        someone's sitting here (their pet takes the seat — see DeskPets). */}
    <group position={[0, 0, occupied ? WORKSTATION_SEAT_Z : 0.1]} rotation={[0, Math.PI, 0]}>
      <Seat />
    </group>
  </group>
)
