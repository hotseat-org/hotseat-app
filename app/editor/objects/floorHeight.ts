import { createContext, useContext } from "react"

/**
 * The shown floor's height in the world (m): 0, except while the floors
 * glide to another (see FloorShift). Surfaces are shaded, and walls cut, by
 * their height above their own floor (or the ground) — never by their height
 * in the world, which a floor arriving a storey up (or one below) doesn't
 * share.
 */
export const shownFloorUniform = { value: 0 }

/** The ground's height in the world (m): under the shown floor by its storeys, gliding with it. */
export const groundUniform = { value: 0 }

/** Where the pieces inside stand: their floor, from the shown floor's. */
export interface FloorPlace {
  /** The floor's height from the shown floor's (m): 0 on it, lower for a floor below. */
  base: number
  /**
   * It stands on another floor: nothing of it shows below its level (the
   * walls' sink would overlap the walls under them, and flicker).
   */
  isUpper: boolean
}

export const FloorPlaceContext = createContext<FloorPlace>({ base: 0, isUpper: false })

export const useFloorPlace = () => useContext(FloorPlaceContext)
