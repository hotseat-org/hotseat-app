import { useMemo } from "react"
import { isNote } from "./items"
import { useNotesStore } from "./store"
import { useI18n } from "~/i18n/I18nProvider"

/** How far round a note the camera frames it (m). */
const FRAME_MARGIN = 3

/**
 * Under the Map menu's Notes switch: every note by what it says; picking one
 * selects it and turns the camera to it.
 */
export const NoteList = () => {
  const { t } = useI18n()
  const objects = useNotesStore((state) => state.objects)
  const notes = useMemo(() => objects.filter(isNote), [objects])
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

  if (notes.length === 0) return null

  return (
    <ul className="flex max-h-40 flex-col overflow-y-auto">
      {notes.map((note) => (
        <li key={note.id}>
          <button
            onClick={() => goTo(note)}
            className="w-full truncate rounded-lg px-2 py-1 text-left text-sm hover:bg-foreground/5"
          >
            {note.noteText ?? <span className="text-muted">{t("Empty note")}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
