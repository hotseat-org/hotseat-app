import { Eye, StickyNote } from "lucide-react"
import { isNote } from "./items"
import { NOTES } from "./looks"
import { NoteLabels } from "./NoteLabels"
import { NoteSection } from "./NoteSection"
import { NotesPanel, useNotes } from "./NotesPanel"
import { createNotesState, type NotesState } from "./store"
import {
  GROUP,
  defineModule,
  selectAll,
  type Command,
  type EditorState,
  type MapLayer,
  type SidePanel,
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

/** The notes' side panel: viewing, once there are notes; editing, always (to start one). */
const NOTES_PANEL: SidePanel = {
  id: "notes",
  label: msg("Notes"),
  icon: StickyNote,
  when: "always",
  Component: NotesPanel,
  useIsShown: (isEditing) => {
    const notes = useNotes()

    return isEditing || notes.length > 0
  },
}

/**
 * A complete small module, as an example to start from: an item (a note on
 * the floor), text written on it in the
 * Inspector, shown above it in 3D (the Map menu's switch hides them), and a
 * side panel to show or hide them, start one and go to one — plus two
 * commands. Its server half (the
 * item and its field, for saved layouts) is items.ts; see notes.test.ts.
 */
export const notesModule = defineModule<NotesState>({
  id: "notes",
  catalog: { items: NOTES },
  createState: createNotesState,
  commands: NOTES_COMMANDS,
  inspectorSections: [NoteSection],
  sceneLayers: [{ Component: NoteLabels, when: "always" }],
  mapLayers: [NOTES_LAYER],
  sidePanels: [NOTES_PANEL],
})
