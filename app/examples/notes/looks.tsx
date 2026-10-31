import { StickyNote } from "lucide-react"
import type { CategoryDefinition, ItemRenderer, MeshProps } from "~/editor"
import type { ObjectType } from "~/editor/core"
import { Surface } from "~/editor/kit"
import { msg } from "~/i18n/msg"

/** A note on a post, leaning back a little so it reads from above. */
const NotePin = ({ color = "#f2c94c" }: MeshProps) => (
  <group>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
      <Surface color="#8a8f98" roughness={0.4} metalness={0.4} />
    </mesh>
    <mesh position={[0, 0.78, 0]} rotation={[-0.4, 0, 0]} castShadow>
      <boxGeometry args={[0.32, 0.32, 0.02]} />
      <Surface color={color} roughness={0.8} />
    </mesh>
  </group>
)

const NotesIcon = ({ className }: { className?: string }) => <StickyNote className={className} />

export const NOTE_RENDERERS: { [Type in ObjectType]?: ItemRenderer } = {
  note: { Mesh: NotePin, tile: { label: msg("Note"), icon: StickyNote, category: "notes" } },
}

export const NOTE_CATEGORIES: CategoryDefinition[] = [
  { id: "notes", label: msg("Notes"), icon: NotesIcon, hint: msg("Reminders left on the floor.") },
]
