import { useOfficeStore } from "../store"

/**
 * Marking a desk as pointed at from elsewhere — its tag, its deskmate — so
 * the desk shows it (its plinth), and letting go of it (only if it's still
 * pointed at from there: the desk itself may have taken over, or another).
 */
export const useHoveredPieceActions = (source: "tag" | "deskmate") => {
  const setHoveredPiece = useOfficeStore((state) => state.setHoveredPiece)
  const clearHoveredPiece = useOfficeStore((state) => state.clearHoveredPiece)

  return {
    setHoveredPiece: (id: string) => setHoveredPiece(id, source),
    clearHoveredPiece: (id: string) => clearHoveredPiece(id, source),
  }
}
