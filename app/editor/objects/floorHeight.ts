import { createContext, useContext } from "react"

/**
 * The shown floor's height in the world (m): 0, except while the floors
 * glide to another (see FloorShift). Surfaces are shaded, and walls cut, by
 * their height above their own floor — never by their height in the world,
 * which a floor arriving a storey up (or one below) doesn't share.
 */
export const shownFloorUniform = { value: 0 }

/**
 * Where the floor the pieces inside stand lies, from the shown floor's (m):
 * 0 on the shown floor; lower for a floor below (see FloorsBelow).
 */
export const FloorBaseContext = createContext(0)

export const useFloorBase = () => useContext(FloorBaseContext)
