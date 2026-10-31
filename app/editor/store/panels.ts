import type { Cell } from "../types"
import type { GetState, SetState } from "./state"

/** What's open over the office: menus, dialogs, cards and the tour. */
export interface PanelsState {
  /**
   * The right-click menu: where it opens (screen px), on which piece (null:
   * the floor), and the floor point under the pointer.
   */
  contextMenu: { x: number; y: number; targetId: string | null; point: Cell } | null
  openContextMenu: (menu: NonNullable<PanelsState["contextMenu"]>) => void
  closeContextMenu: () => void
  /** The command search (⌘K). */
  isCommandSearchOpen: boolean
  setCommandSearchOpen: (isOpen: boolean) => void
  /** The guided tour of the editor (first run, or asked for). */
  isTourOpen: boolean
  setTourOpen: (isOpen: boolean) => void
  /** The side panel open beside the rail (see SidePanel), by id. */
  openSidePanelId: string | null
  /** Open it, or close it when it's the one open. */
  toggleSidePanel: (id: string) => void
  closeSidePanel: () => void
}

export const createPanelsState = (set: SetState, _get: GetState): PanelsState => ({
  contextMenu: null,
  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
  isCommandSearchOpen: false,
  setCommandSearchOpen: (isCommandSearchOpen) => set({ isCommandSearchOpen, contextMenu: null }),
  isTourOpen: false,
  setTourOpen: (isTourOpen) => set({ isTourOpen }),
  openSidePanelId: null,
  toggleSidePanel: (id) =>
    set((state) => ({ openSidePanelId: state.openSidePanelId === id ? null : id })),
  closeSidePanel: () => set({ openSidePanelId: null }),
})
