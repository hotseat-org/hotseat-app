import { StickyNote } from "lucide-react"
import type { CategoryDefinition, MeshProps } from "~/editor"
import { defineItem, hasTag, type SceneObject } from "~/editor/core"
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

/** A note pinned to the floor: a reminder left on the layout. What it is, and how it looks. */
export const NOTE_ITEMS = {
  note: defineItem({
    mount: "floor",
    footprint: [1, 1],
    defaultColor: "#f2c94c",
    tags: ["note"],
    Mesh: NotePin,
    tile: { label: msg("Note"), icon: StickyNote, category: "notes" },
  }),
}

// An item joins the layout's types: saved layouts and the server know it too.
type NoteItems = typeof NOTE_ITEMS
declare module "~/editor/catalog/registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CatalogItems extends NoteItems {}
}

const NotesIcon = ({ className }: { className?: string }) => <StickyNote className={className} />

export const NOTE_CATEGORIES: CategoryDefinition[] = [
  { id: "notes", label: msg("Notes"), icon: NotesIcon, hint: msg("Reminders left on the floor.") },
]

export const isNote = (piece: SceneObject) => hasTag(piece.type, "note")
