import { useEffect } from "react"
import { isTypingTarget } from "../keyboard"
import { useEditorStoreApi } from "../store"
import { isEdgeType } from "../types"
import { TOOLS } from "../ui/tools"

const KEY_TO_TOOL = new Map(TOOLS.map((tool) => [tool.key, tool.tool]))

/** Keyboard shortcuts (tools, undo, clipboard, rotate, delete, deselect) — edit only. */
export const useEditorShortcuts = (readOnly: boolean) => {
  const store = useEditorStoreApi()
  useEffect(() => {
    if (readOnly) return
    const onKey = (event: KeyboardEvent) => {
      // Undo / redo: ⌘Z / ⇧⌘Z (Ctrl on Windows/Linux), plus ⌘Y.
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !isTypingTarget(event.target)) {
        const key = event.key.toLowerCase()
        // The command search: ⌘K (Ctrl+K).
        if (key === "k") {
          event.preventDefault()
          return store.getState().setCommandSearchOpen(true)
        }
        if (key === "z" || key === "y") {
          event.preventDefault()
          if (key === "y" || event.shiftKey) store.getState().redo()
          else store.getState().undo()
          return
        }
        // Clipboard + duplicate for the selection (furniture).
        if (key === "c") return store.getState().copySelection()
        if (key === "v") return store.getState().paste()
        if (key === "d") {
          event.preventDefault() // not the browser's bookmark shortcut
          return store.getState().duplicateSelection()
        }
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const state = store.getState()

      const mapped = KEY_TO_TOOL.get(event.key)
      if (mapped) {
        state.setTool(mapped)
        return
      }

      if (event.key === "m" || event.key === "M") {
        state.toggleMeasureHints()
        return
      }

      if (event.key === "r" || event.key === "R") {
        // Rotate the selected furniture (each piece in place); with nothing
        // turnable selected (or a wall/door), rotate the next placement.
        const selection = state.objects.find((piece) => piece.id === state.selectedId)
        if (selection && !isEdgeType(selection.type)) state.rotateSelection()
        else state.rotatePlacement()
        return
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (state.selection.length) {
          event.preventDefault()
          state.removeSelection()
        }
        return
      }

      if (event.key === "Escape") {
        state.select(null)
        state.setTool("select")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [readOnly, store])
}
