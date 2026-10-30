import { Suspense } from "react"
import { Desk } from "./Desk"
import { Seat } from "./Seat"
import { NameTag } from "./NameTag"
import { modelById } from "~/editor/models"
import { DESKMATE_SEAT_Z, SEAT } from "~/editor/objects/dimensions"
import { WiggleModel } from "~/editor/objects/WiggleModel"

interface Props {
  color?: string
  /** Which animal is sitting on the chair (set at placement). */
  model?: string
  variant?: number
  /**
   * Set in view mode, where the desk's pet comes from its booking (DeskPets)
   * instead: the placed animal only shows while editing.
   */
  occupied?: boolean
}

/**
 * A workstation with the chair pulled out and a random animal perched on it
 * (occasionally wiggling). The animal is chosen at placement time and stored on
 * the object. Footprint 4×4 (chair is out, not tucked). Ghost previews pass no
 * `model`, so they render just the desk + chair.
 */
export const Deskmate = ({ color, model, variant, occupied }: Props) => {
  const animal = model && occupied === undefined ? modelById(model) : undefined

  return (
    <group>
      <group position={[0, 0, -0.35]}>
        <Desk color={color} variant={variant} occupied={occupied} />
      </group>
      {/* Chair pulled out, facing the desk */}
      <group position={[0, 0, DESKMATE_SEAT_Z]} rotation={[0, Math.PI, 0]}>
        <Seat />
      </group>
      {animal && (
        <>
          <Suspense fallback={null}>
            <group position={[0, SEAT.seatHeight + 0.06, 0.4]} rotation={[0, Math.PI, 0]}>
              <WiggleModel url={animal.url} scale={0.4} />
            </group>
          </Suspense>
          <NameTag text={animal.label} position={[0, 1.5, 0.4]} />
        </>
      )}
    </group>
  )
}
