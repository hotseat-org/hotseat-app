import { getModuleStoreHooks, type EditorState, type SetState } from "~/editor"

/** The notes module's part of the editor's state. */
export interface NotesState {
  /** Write on a note: one undo step, none when it's unchanged. */
  setNoteText: (id: string, text: string) => void
}

export const createNotesState = (set: SetState<EditorState & NotesState>): NotesState => ({
  setNoteText: (id, text) =>
    set((state) => {
      const noteText = text.trim() || undefined
      const note = state.objects.find((piece) => piece.id === id)
      if (!note || note.noteText === noteText) return {}

      return {
        objects: state.objects.map((piece) => (piece.id === id ? { ...piece, noteText } : piece)),
      }
    }),
})

const notesStoreHooks = getModuleStoreHooks<NotesState>()

/** The editor's store, read with the notes' state on top. */
export const useNotesStore = notesStoreHooks.useStore
