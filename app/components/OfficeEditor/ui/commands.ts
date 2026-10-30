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
  isAvailable: (state: EditorState) => boolean
  run: (state: EditorState) => void
}

const GROUP = {
  selection: msg("Selection"),
  edit: msg("Edit"),
  place: msg("Place"),
  tools: msg("Tools"),
  view: msg("View"),
}

const always = () => true
const isFurniture = (object: SceneObject) => !isEdgeType(object.type) && !isMarker(object.type)
const selectedFurniture = (state: EditorState) =>
  state.objects.filter((object) => state.selection.includes(object.id) && isFurniture(object))
const hasSelection = (state: EditorState) => selectedFurniture(state).length > 0
const primaryOf = (state: EditorState) =>
  state.objects.find((object) => object.id === state.selectedId)

/** Select these (and switch to Select, so the selection shows and can be moved). */
const selectAll = (state: EditorState, ids: string[]) => {
  state.setTool("select")
  state.selectMany(ids)
}

export const SELECTION_COMMANDS: Command[] = [
  {
    id: "rotate",
    label: msg("Rotate"),
    group: GROUP.selection,
    icon: RotateCw,
    shortcut: "R",
    isAvailable: hasSelection,
    run: (state) => state.rotateSelection(),
  },
  {
    id: "duplicate",
    label: msg("Duplicate"),
    group: GROUP.selection,
    icon: Copy,
    shortcut: "⌘D",
    isAvailable: hasSelection,
    run: (state) => state.duplicateSelection(),
  },
  {
    id: "copy",
    label: msg("Copy"),
    group: GROUP.selection,
    icon: Clipboard,
    shortcut: "⌘C",
    isAvailable: hasSelection,
    run: (state) => state.copySelection(),
  },
  {
    id: "selectSameType",
    label: msg("Select all like this"),
    group: GROUP.selection,
    icon: SquareDashedMousePointer,
    isAvailable: (state) => !!primaryOf(state) && isFurniture(primaryOf(state)!),
    run: (state) => {
      const type = primaryOf(state)?.type
      selectAll(
        state,
        state.objects.filter((object) => object.type === type).map((object) => object.id)
      )
    },
  },
  {
    id: "selectRoom",
    label: msg("Select everything in this room"),
    group: GROUP.selection,
    icon: SquareDashedMousePointer,
    isAvailable: (state) => {
      const object = primaryOf(state)
      return (
        !!object &&
        isFurniture(object) &&
        furnitureInRoomAt(state.objects, object.x, object.z).length > 0
      )
    },
    run: (state) => {
      const object = primaryOf(state)
      if (object) selectAll(state, furnitureInRoomAt(state.objects, object.x, object.z))
    },
  },
  {
    id: "delete",
    label: msg("Delete"),
    group: GROUP.selection,
    icon: Trash2,
    shortcut: "Del",
    isAvailable: hasSelection,
    run: (state) => state.removeSelection(),
  },
]

export const EDIT_COMMANDS: Command[] = [
  {
    id: "undo",
    label: msg("Undo"),
    group: GROUP.edit,
    icon: Undo2,
    shortcut: "⌘Z",
    isAvailable: (state) => state.past.length > 0,
    run: (state) => state.undo(),
  },
  {
    id: "redo",
    label: msg("Redo"),
    group: GROUP.edit,
    icon: Redo2,
    shortcut: "⇧⌘Z",
    isAvailable: (state) => state.future.length > 0,
    run: (state) => state.redo(),
  },
  {
    id: "paste",
    label: msg("Paste"),
    group: GROUP.edit,
    icon: ClipboardPaste,
    shortcut: "⌘V",
    isAvailable: (state) => state.clipboard.length > 0,
    run: (state) => state.paste(),
  },
  {
    id: "selectDesks",
    label: msg("Select all desks"),
    group: GROUP.edit,
    icon: SquareDashedMousePointer,
    isAvailable: (state) => state.objects.some((object) => isSeatable(object.type)),
    run: (state) =>
      selectAll(
        state,
        state.objects.filter((object) => isSeatable(object.type)).map((object) => object.id)
      ),
  },
  {
    id: "selectFurniture",
    label: msg("Select all furniture"),
    group: GROUP.edit,
    icon: SquareDashedMousePointer,
    isAvailable: (state) => state.objects.some(isFurniture),
    run: (state) =>
      selectAll(
        state,
        state.objects.filter(isFurniture).map((object) => object.id)
      ),
  },
  {
    id: "numberDesks",
    label: msg("Number the unnumbered desks"),
    group: GROUP.edit,
    icon: Hash,
    isAvailable: (state) =>
      state.objects.some((object) => isSeatable(object.type) && !object.label),
    run: (state) => state.numberDesks(),
  },
  {
    id: "numberDesksByZone",
    label: msg("Number desks by zone"),
    group: GROUP.edit,
    icon: Hash,
    isAvailable: (state) => getZones(state.objects).length > 0,
    run: (state) => state.numberDesksByZone(),
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
    run: (state) => state.requestFit(),
  },
  {
    id: "measureHints",
    label: msg("Measuring hints on / off"),
    group: GROUP.view,
    icon: Ruler,
    shortcut: "M",
    isAvailable: always,
    run: (state) => state.toggleMeasureHints(),
  },
  {
    id: "tour",
    label: msg("Show the tour"),
    group: GROUP.view,
    icon: GraduationCap,
    isAvailable: (state) => !state.isTourOpen,
    run: (state) => state.setTourOpen(true),
  },
]

const isArmedRepeatable = (state: EditorState) =>
  state.tool !== "select" &&
  state.tool !== "delete" &&
  state.tool !== "paint" &&
  isRepeatable(state.tool)

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
  isAvailable: (state) => isArmedRepeatable(state) && state.placementPattern !== pattern,
  run: (state) => state.setPlacementPattern(pattern),
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
      isAvailable: (state: EditorState) => state.tool !== tool,
      run: (state: EditorState) => state.setTool(tool),
    }
  }),
  {
    id: "tool-paint",
    label: msg("Paint"),
    group: GROUP.tools,
    icon: PaintBucket,
    isAvailable: (state) => state.tool !== "paint",
    run: (state) => state.setTool("paint"),
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
      isAvailable: (state: EditorState) => state.tool !== type,
      run: (state: EditorState) => state.setTool(type),
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
    if (labelWords.some((labelWord) => labelWord.startsWith(word))) score += 2
    else if (text.includes(word)) score += 1
    else return 0
  }
  return score + (text.startsWith(words[0]) ? 1 : 0)
}
