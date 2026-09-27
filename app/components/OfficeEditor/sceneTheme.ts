import { createContext, useContext } from "react"
import { SURFACES, type SurfacePalette } from "./palette"

/**
 * The active surface palette. Provided inside the <Canvas> (context doesn't
 * cross the R3F reconciler) from the app theme read outside it.
 */
export const SceneThemeContext = createContext<SurfacePalette>(SURFACES.light)

export const useSurfaces = () => useContext(SceneThemeContext)
