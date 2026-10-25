import {
  Clipboard,
  ClipboardPaste,
  Copy,
  GraduationCap,
  Hash,
  LayoutGrid,
  LogOut,
  Maximize,
  PaintBucket,
  Redo2,
  RotateCw,
  Rows3,
  Ruler,
  Square,
  SquareDashedMousePointer,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react"
import { furnitureInRoomAt } from "../layout"
import { getZones } from "../zones"
import type { EditorState } from "../store"
import { isEdgeType, isMarker, isSeatable, type SceneObject } from "../types"
import { CATEGORIES, TOOL_META, isRepeatable } from "./categories"
import { msg } from "~/i18n/msg"

/**
 * One thing the editor can do, shared by the command search (⌘K) and the
 * right-click menu: what it's called, where it's listed, its shortcut, and
 * whether it applies right now.
 */
export interface Command {
  id: string
  /** English text, translated where it's shown. */
  label: string
  group: string
  icon: LucideIcon
  shortcut?: string
  isAvailable: (s: EditorState) => boolean
  run: (s: EditorState) => void
}

const GROUP = {
  selection: msg("Selection"),
  edit: msg("Edit"),
  place: msg("Place"),
  tools: msg("Tools"),
  view: msg("View"),
}

const always = () => true
const isFurniture = (o: SceneObject) => !isEdgeType(o.type) && !isMarker(o.type)
const selectedFurniture = (s: EditorState) =>
  s.objects.filter((o) => s.selection.includes(o.id) && isFurniture(o))
const hasSelection = (s: EditorState) => selectedFurniture(s).length > 0
const primaryOf = (s: EditorState) => s.objects.find((o) => o.id === s.selectedId)

/** Select these (and switch to Select, so the selection shows and can be moved). */
const selectAll = (s: EditorState, ids: string[]) => {
  s.setTool("select")
  s.selectMany(ids)
}

export const SELECTION_COMMANDS: Command[] = [
  {
    id: "rotate",
    label: msg("Rotate"),
    group: GROUP.selection,
    icon: RotateCw,
    shortcut: "R",
    isAvailable: hasSelection,
    run: (s) => s.rotateSelection(),
  },
  {
    id: "duplicate",
    label: msg("Duplicate"),
    group: GROUP.selection,
    icon: Copy,
    shortcut: "⌘D",
    isAvailable: hasSelection,
    run: (s) => s.duplicateSelection(),
  },
  {
    id: "copy",
    label: msg("Copy"),
    group: GROUP.selection,
    icon: Clipboard,
    shortcut: "⌘C",
    isAvailable: hasSelection,
    run: (s) => s.copySelection(),
  },
  {
    id: "selectSameType",
    label: msg("Select all like this"),
    group: GROUP.selection,
    icon: SquareDashedMousePointer,
    isAvailable: (s) => !!primaryOf(s) && isFurniture(primaryOf(s)!),
    run: (s) => {
      const type = primaryOf(s)?.type
      selectAll(
        s,
        s.objects.filter((o) => o.type === type).map((o) => o.id)
      )
    },
  },
  {
    id: "selectRoom",
    label: msg("Select everything in this room"),
    group: GROUP.selection,
    icon: SquareDashedMousePointer,
    isAvailable: (s) => {
      const o = primaryOf(s)
      return !!o && isFurniture(o) && furnitureInRoomAt(s.objects, o.x, o.z).length > 0
    },
    run: (s) => {
      const o = primaryOf(s)
      if (o) selectAll(s, furnitureInRoomAt(s.objects, o.x, o.z))
    },
  },
  {
    id: "delete",
    label: msg("Delete"),
    group: GROUP.selection,
    icon: Trash2,
    shortcut: "Del",
    isAvailable: hasSelection,
    run: (s) => s.removeSelection(),
  },
]

export const EDIT_COMMANDS: Command[] = [
  {
    id: "undo",
    label: msg("Undo"),
    group: GROUP.edit,
    icon: Undo2,
    shortcut: "⌘Z",
    isAvailable: (s) => s.past.length > 0,
    run: (s) => s.undo(),
  },
  {
    id: "redo",
    label: msg("Redo"),
    group: GROUP.edit,
    icon: Redo2,
    shortcut: "⇧⌘Z",
    isAvailable: (s) => s.future.length > 0,
    run: (s) => s.redo(),
  },
  {
    id: "paste",
    label: msg("Paste"),
    group: GROUP.edit,
    icon: ClipboardPaste,
    shortcut: "⌘V",
    isAvailable: (s) => s.clipboard.length > 0,
    run: (s) => s.paste(),
  },
  {
    id: "selectDesks",
    label: msg("Select all desks"),
    group: GROUP.edit,
    icon: SquareDashedMousePointer,
    isAvailable: (s) => s.objects.some((o) => isSeatable(o.type)),
    run: (s) =>
      selectAll(
        s,
        s.objects.filter((o) => isSeatable(o.type)).map((o) => o.id)
      ),
  },
  {
    id: "selectFurniture",
    label: msg("Select all furniture"),
    group: GROUP.edit,
    icon: SquareDashedMousePointer,
    isAvailable: (s) => s.objects.some(isFurniture),
    run: (s) =>
      selectAll(
        s,
        s.objects.filter(isFurniture).map((o) => o.id)
      ),
  },
  {
    id: "numberDesks",
    label: msg("Number the unnumbered desks"),
    group: GROUP.edit,
    icon: Hash,
    isAvailable: (s) => s.objects.some((o) => isSeatable(o.type) && !o.label),
    run: (s) => s.numberDesks(),
  },
  {
    id: "numberDesksByZone",
    label: msg("Number desks by zone"),
    group: GROUP.edit,
    icon: Hash,
    isAvailable: (s) => getZones(s.objects).length > 0,
    run: (s) => s.numberDesksByZone(),
  },
]

export const VIEW_COMMANDS: Command[] = [
  {
    id: "fit",
    label: msg("Fit to office"),
    group: GROUP.view,
    icon: Maximize,
    shortcut: "F",
    isAvailable: always,
    run: (s) => s.requestFit(),
  },
  {
    id: "measureHints",
    label: msg("Measuring hints on / off"),
    group: GROUP.view,
    icon: Ruler,
    shortcut: "M",
    isAvailable: always,
    run: (s) => s.toggleMeasureHints(),
  },
  {
    id: "tour",
    label: msg("Show the tour"),
    group: GROUP.view,
    icon: GraduationCap,
    isAvailable: (s) => !s.isTourOpen,
    run: (s) => s.setTourOpen(true),
  },
]

const isArmedRepeatable = (s: EditorState) =>
  s.tool !== "select" && s.tool !== "delete" && s.tool !== "paint" && isRepeatable(s.tool)

const PATTERN_COMMANDS: Command[] = (
  [
    ["single", msg("Place one at a time"), Square],
    ["row", msg("Place in rows"), Rows3],
    ["pod", msg("Place in pods (back to back)"), LayoutGrid],
  ] as const
).map(([pattern, label, icon]) => ({
  id: `pattern-${pattern}`,
  label,
  group: GROUP.tools,
  icon,
  isAvailable: (s) => isArmedRepeatable(s) && s.placementPattern !== pattern,
  run: (s) => s.setPlacementPattern(pattern),
}))

const TOOL_COMMANDS: Command[] = [
  ...(["select", "delete"] as const).map((tool) => {
    const meta = TOOL_META.get(tool)!
    return {
      id: `tool-${tool}`,
      label: meta.label,
      group: GROUP.tools,
      icon: meta.icon,
      shortcut: meta.key || undefined,
      isAvailable: (s: EditorState) => s.tool !== tool,
      run: (s: EditorState) => s.setTool(tool),
    }
  }),
  {
    id: "tool-paint",
    label: msg("Paint"),
    group: GROUP.tools,
    icon: PaintBucket,
    isAvailable: (s) => s.tool !== "paint",
    run: (s) => s.setTool("paint"),
  },
  ...PATTERN_COMMANDS,
]

/** Every catalog piece, by name: arming it opens its category. */
const PLACE_COMMANDS: Command[] = CATEGORIES.flatMap((category) =>
  category.types.map((type) => {
    const meta = TOOL_META.get(type)!
    return {
      id: `place-${type}`,
      label: meta.label,
      group: GROUP.place,
      icon: meta.icon,
      shortcut: meta.key || undefined,
      isAvailable: (s: EditorState) => s.tool !== type,
      run: (s: EditorState) => s.setTool(type),
    }
  })
)

/** Everything the command search offers; `onDone` leaves editing. */
export const composeCommands = (onDone?: () => void): Command[] => [
  ...SELECTION_COMMANDS,
  ...EDIT_COMMANDS,
  ...TOOL_COMMANDS,
  ...PLACE_COMMANDS,
  ...VIEW_COMMANDS,
  ...(onDone
    ? [
        {
          id: "done",
          label: msg("Done editing"),
          group: GROUP.view,
          icon: LogOut,
          isAvailable: always,
          run: onDone,
        },
      ]
    : []),
]

/** Lower-case, without accents: "Židle" is found by "zidle". */
export const toSearchText = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/**
 * How well a label matches a query (higher is better; 0: no match). Every
 * word of the query must start a word of the label, or appear in it — so
 * "sel desk" finds "Select all desks", and a word's start beats its middle.
 */
export const scoreMatch = (label: string, query: string): number => {
  const words = toSearchText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const text = toSearchText(label)
  const labelWords = text.split(/[\s/()·-]+/)
  let score = 0
  for (const word of words) {
    if (labelWords.some((w) => w.startsWith(word))) score += 2
    else if (text.includes(word)) score += 1
    else return 0
  }
  return score + (text.startsWith(words[0]) ? 1 : 0)
}
