import { Html } from "@react-three/drei"
import { useMemo } from "react"
import { isNote } from "./items"
import { useNotesStore } from "./store"

/** In 3D, above each written note: its text (the Map menu's Notes layer hides them). */
export const NoteLabels = () => {
  const objects = useNotesStore((state) => state.objects)
  const isShown = useNotesStore((state) => state.layers.notes)
  const notes = useMemo(() => objects.filter((piece) => isNote(piece) && piece.noteText), [objects])
  if (!isShown) return null

  return notes.map((note) => (
    <Html key={note.id} position={[note.x, 1.15, note.z]} center zIndexRange={[20, 0]}>
      <div className="pointer-events-none w-max max-w-48 rounded-lg bg-[#fff6c8] px-2.5 py-1.5 text-xs text-[#4a3f12] shadow-md">
        {note.noteText}
      </div>
    </Html>
  ))
}
