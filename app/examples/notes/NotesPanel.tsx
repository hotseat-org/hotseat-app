import clsx from "clsx"
import { Eye, EyeOff, Plus } from "lucide-react"
import { useMemo } from "react"
import { isNote } from "./items"
import { useNotesStore } from "./store"
import type { SidePanelProps } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"

/** How far round a note the camera frames it (m). */
const FRAME_MARGIN = 3

/** Every note, for the side panel and whether it's offered. */
export const useNotes = () => {
  const objects = useNotesStore((state) => state.objects)

  return useMemo(() => objects.filter(isNote), [objects])
}

/**
 * The notes' side panel: show or hide them on the map, start a new one
 * (editing), and every note by what it says — picking one selects it and
 * turns the camera to it.
 */
export const NotesPanel = ({ isEditing }: SidePanelProps) => {
  const { t } = useI18n()
  const notes = useNotes()
  const isShown = useNotesStore((state) => state.layers.notes)
  const toggleLayer = useNotesStore((state) => state.toggleLayer)
  const setTool = useNotesStore((state) => state.setTool)
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
    <>
      <div className="mb-2 mt-1.5 flex shrink-0 gap-1.5">
        {isEditing && (
          // Arms the note: a click on the floor places it (the panel stays open).
          <button
            type="button"
            onClick={() => setTool("note")}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent/15 text-xs font-semibold text-foreground transition-colors hover:bg-accent/25"
          >
            <Plus className="size-4" /> {t("New note")}
          </button>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={isShown}
          onClick={() => toggleLayer("notes")}
          className={clsx(
            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors",
            isShown
              ? "bg-foreground/[0.07] text-foreground hover:bg-foreground/10"
              : "bg-foreground/[0.04] text-muted hover:bg-foreground/10"
          )}
        >
          {isShown ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {isShown ? t("Shown") : t("Hidden")}
        </button>
      </div>

      {notes.length === 0 && (
        <p className="px-1 text-[11px] leading-snug text-muted">
          {t("No notes yet. Place one, then write on it in the Inspector.")}
        </p>
      )}

      <ul className="-mr-2 flex min-h-0 flex-1 flex-col overflow-y-auto pr-2 [scrollbar-width:thin]">
        {notes.map((note) => (
          <li key={note.id}>
            <button
              type="button"
              onClick={() => goTo(note)}
              className="w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-foreground/5"
            >
              {note.noteText ?? <span className="text-muted">{t("Empty note")}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
