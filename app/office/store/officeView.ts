import { type OfficeGetState, type OfficeSetState } from "./state"

/** What the office shows over the map: the desk filter, the heatmap, a spotlit desk, the way to one. */
export interface OfficeViewState {
  /** View: show only desks with all these features (others dimmed). */
  deskFilter: string[]
  toggleDeskFilter: (feature: string) => void
  /** Insights (admins): each desk's share of working days in use, for a period, over the office. */
  heatmap: { period: "4w" | "12w" | "next"; ratios: Record<string, number> } | null
  setHeatmap: (heatmap: OfficeViewState["heatmap"]) => void
  /** Plan: a desk to bring into view and highlight ("Show my desk", "Find"); the plan clears it once shown. */
  spotlight: { id: string } | null
  spotlightSeat: (id: string) => void
  resetSpotlight: () => void
  /**
   * Wayfinding: the desk whose way is shown (see wayfinding.ts) — drawn on the
   * floor in both views until closed. `from`: start at your own desk when you
   * have one that day (the default), or the nearest entrance. `nonce`
   * re-frames the view when asked again or switched.
   */
  route: { deskId: string; from: "desk" | "entrance"; nonce: number } | null
  showRoute: (deskId: string) => void
  setRouteFrom: (from: "desk" | "entrance") => void
  clearRoute: () => void
}

export const createOfficeViewState = (
  set: OfficeSetState,
  _get: OfficeGetState
): OfficeViewState => ({
  deskFilter: [],
  toggleDeskFilter: (feature) =>
    set((state) => ({
      deskFilter: state.deskFilter.includes(feature)
        ? state.deskFilter.filter((active) => active !== feature)
        : [...state.deskFilter, feature],
    })),
  heatmap: null,
  setHeatmap: (heatmap) => set({ heatmap, seatCard: null }),
  spotlight: null,
  spotlightSeat: (id) => set({ spotlight: { id }, seatCard: null }),
  resetSpotlight: () => set({ spotlight: null }),
  route: null,
  showRoute: (deskId) =>
    set((state) => ({
      route: { deskId, from: "desk", nonce: (state.route?.nonce ?? 0) + 1 },
      seatCard: null,
    })),
  setRouteFrom: (from) =>
    set((state) =>
      state.route ? { route: { ...state.route, from, nonce: state.route.nonce + 1 } } : {}
    ),
  clearRoute: () => set({ route: null }),
})
