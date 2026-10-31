import { MAX_NOTE_LENGTH, isNote } from "./items"
import { useNotesStore } from "./store"
import type { InspectorSectionProps } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"

/** The Inspector, for one selected note: what's written on it. */
export const NoteSection = ({ selected, count }: InspectorSectionProps) => {
  const { t } = useI18n()
  const setNoteText = useNotesStore((state) => state.setNoteText)
  if (count !== 1 || !isNote(selected)) return null

  return (
    <div className="mb-4 flex flex-col gap-2">
      <label htmlFor={`note-${selected.id}`} className="text-xs font-medium text-muted">
        {t("Text")}
      </label>
      <textarea
        id={`note-${selected.id}`}
        // Keyed by note so switching selection resets the draft; saved when
        // it loses focus — one undo step, not one per letter.
        key={selected.id}
        defaultValue={selected.noteText ?? ""}
        placeholder={t("Write a note…")}
        maxLength={MAX_NOTE_LENGTH}
        rows={4}
        onBlur={(event) => setNoteText(selected.id, event.currentTarget.value)}
        className="resize-none rounded-lg border border-border bg-surface px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
    </div>
  )
}
