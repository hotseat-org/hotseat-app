import { getModuleStoreHooks, type EditorState, type SetState } from "~/editor"

/** The notes module's part of the editor's state. */
export interface NotesState {
  /** Whether the list of notes is shown. */
  isNotesListOpen: boolean
  toggleNotesList: () => void
}

export const createNotesState = (set: SetState<EditorState & NotesState>): NotesState => ({
  isNotesListOpen: false,
  toggleNotesList: () => set((state) => ({ isNotesListOpen: !state.isNotesListOpen })),
})

const notesStoreHooks = getModuleStoreHooks<NotesState>()

/** The editor's store, read with the notes' state on top. */
export const useNotesStore = notesStoreHooks.useStore
