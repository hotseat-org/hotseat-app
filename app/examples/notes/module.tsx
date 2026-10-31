import { List, StickyNote } from "lucide-react"
import { NOTE_ITEMS, isNote } from "./catalog"
import { NOTE_CATEGORIES, NOTE_RENDERERS } from "./looks"
import { createNotesSlice, useNotesStore, type NotesState } from "./store"
import { GROUP, defineModule, selectAll, type Command, type EditorState } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

const NOTES_COMMANDS: Command<EditorState & NotesState>[] = [
  {
    id: "selectNotes",
    label: msg("Select all notes"),
    group: GROUP.selection,
    icon: StickyNote,
    isAvailable: (state) => state.objects.some(isNote),
    run: (state) =>
      selectAll(
        state,
        state.objects.filter(isNote).map((note) => note.id)
      ),
  },
  {
    id: "toggleNotesList",
    label: msg("Show or hide the notes list"),
    group: GROUP.view,
    icon: List,
    isAvailable: () => true,
    run: (state) => state.toggleNotesList(),
  },
]

/** How many notes there are, while the list is open. */
const NotesList = () => {
  const { tn } = useI18n()
  const isOpen = useNotesStore((state) => state.isNotesListOpen)
  const noteCount = useNotesStore((state) => state.objects.filter(isNote).length)
  if (!isOpen) return null

  return (
    <div className="pointer-events-auto absolute right-4 top-20 rounded-2xl bg-surface p-4 shadow-lg">
      {tn(noteCount, "{n} note", "{n} notes")}
    </div>
  )
}

/**
 * The smallest useful module, as an example to start from: one kind of
 * piece (a note on the floor) with its own catalogue section, a slice of
 * state, two commands and a panel. Not part of the app — see notes.test.ts.
 */
export const notesModule = defineModule<NotesState>({
  id: "notes",
  catalog: { items: NOTE_ITEMS, renderers: NOTE_RENDERERS, categories: NOTE_CATEGORIES },
  createSlice: createNotesSlice,
  commands: NOTES_COMMANDS,
  panels: [{ Component: NotesList, when: "always" }],
})
