import { Eye, StickyNote } from "lucide-react"
import { isNote } from "./items"
import { NOTE_CATEGORIES, NOTES } from "./looks"
import { NoteLabels } from "./NoteLabels"
import { NoteSection } from "./NoteSection"
import { NOTES_MENU_SECTION } from "./NotesMenu"
import { createNotesState, type NotesState } from "./store"
import {
  GROUP,
  defineModule,
  selectAll,
  type Command,
  type EditorState,
  type MapLayer,
} from "~/editor"
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
    id: "toggleNotes",
    label: msg("Show or hide the notes"),
    group: GROUP.view,
    icon: Eye,
    isAvailable: (state) => state.objects.some(isNote),
    run: (state) => state.toggleLayer("notes"),
  },
]

/** The Map menu's switch for what's written on the notes. */
const NOTES_LAYER: MapLayer = {
  id: "notes",
  label: msg("Notes"),
  hint: msg("What's written on each note"),
  icon: StickyNote,
  when: "always",
  isOnByDefault: true,
}

/**
 * A complete small module, as an example to start from: an item (a note on
 * the floor) with its catalogue section, text written on it in the
 * Inspector, shown above it in 3D, and the Map menu's switch to hide the
 * notes and list to go to one — plus two commands. Its server half (the
 * item and its field, for saved layouts) is items.ts; see notes.test.ts.
 */
export const notesModule = defineModule<NotesState>({
  id: "notes",
  catalog: { items: NOTES, categories: NOTE_CATEGORIES },
  createState: createNotesState,
  commands: NOTES_COMMANDS,
  inspectorSections: [NoteSection],
  sceneLayers: [{ Component: NoteLabels, when: "always" }],
  mapLayers: [NOTES_LAYER],
  mapMenuSection: NOTES_MENU_SECTION,
})
