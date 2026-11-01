import { useOfficeStoreApi } from "../store"

/**
 * Marking a desk as pointed at from elsewhere — its tag, its deskmate — so
 * the desk shows it (its plinth), and letting go of it (only if it's still
 * the one: the pointer may already be on another).
 */
export const useHoveredPieceActions = () => {
  const store = useOfficeStoreApi()

  return {
    setHoveredPiece: (id: string) => store.getState().setHoveredPiece(id),
    clearHoveredPiece: (id: string) => {
      if (store.getState().hoveredPieceId === id) store.getState().setHoveredPiece(null)
    },
  }
}
