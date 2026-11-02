import { type OfficeGetState, type OfficeSetState } from "./state"

/** Neon signs: what each says, and its tubes' colour. */
export interface SignsState {
  /** Write on a sign ("" goes back to the default): one undo step, none when it's unchanged. */
  setSignText: (id: string, text: string) => void
  /** Light a sign's tubes in another colour (one of NEON_COLORS). */
  setSignColor: (id: string, color: string) => void
}

export const createSignsState = (set: OfficeSetState, _get: OfficeGetState): SignsState => ({
  setSignText: (id, text) =>
    set((state) => {
      const signText = text.trim() || undefined
      const sign = state.objects.find((piece) => piece.id === id)
      if (!sign || sign.signText === signText) return {}

      return {
        objects: state.objects.map((piece) => (piece.id === id ? { ...piece, signText } : piece)),
      }
    }),
  setSignColor: (id, color) =>
    set((state) => ({
      objects: state.objects.map((piece) => (piece.id === id ? { ...piece, color } : piece)),
    })),
})
