import { useMemo } from "react"
import { isNote } from "./items"
import { useNotesStore } from "./store"
import type { MapMenuSection } from "~/editor"
import { msg } from "~/i18n/msg"
import { useI18n } from "~/i18n/I18nProvider"

/** How far round a note the camera frames it (m). */
const FRAME_MARGIN = 3

const useNotes = () => {
  const objects = useNotesStore((state) => state.objects)

  return useMemo(() => objects.filter(isNote), [objects])
}

/** Every note by what it says: picking one selects it and turns the camera to it. */
const NoteList = () => {
  const { t } = useI18n()
  const notes = useNotes()
  const select = useNotesStore((state) => state.select)
  const requestFrame = useNotesStore((state) => state.requestFrame)
  const goTo = (note: (typeof notes)[number]) => {
    select(note.id)
    requestFrame({
      minX: note.x - FRAME_MARGIN,
      maxX: note.x + FRAME_MARGIN,
      minZ: note.z - FRAME_MARGIN,
      maxZ: note.z + FRAME_MARGIN,
    })
  }

  return (
    <ul className="flex max-h-48 flex-col overflow-y-auto">
      {notes.map((note) => (
        <li key={note.id}>
          <button
            onClick={() => goTo(note)}
            className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-default"
          >
            {note.noteText ?? <span className="text-muted">{t("Empty note")}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The Map menu's list of notes, once there are any. */
export const NOTES_MENU_SECTION: MapMenuSection = {
  heading: msg("Go to a note"),
  Component: NoteList,
  when: "always",
  useIsShown: () => useNotes().length > 0,
  useChangeCount: () => 0,
}
