import { createContext, useContext } from "react"
import type { SceneObject } from "../types"

/**
 * The piece a model is drawn for (see ObjectRenderer) — for a model that
 * looks round it (stairs: is there a wall beside them?). Null in a
 * thumbnail.
 */
export const PieceContext = createContext<SceneObject | null>(null)

/** The pieces of the floor being drawn — the shown one's, or a floor below's. Null in a thumbnail. */
export const FloorPiecesContext = createContext<SceneObject[] | null>(null)

export const usePiece = () => useContext(PieceContext)

export const useFloorPieces = () => useContext(FloorPiecesContext)
