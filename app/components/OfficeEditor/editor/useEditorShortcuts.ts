import { useEffect } from "react"
import { isTypingTarget } from "../keyboard"
import { useEditorStoreApi } from "../store"
import { isEdgeType } from "../types"
import { TOOLS } from "../ui/tools"

const KEY_TO_TOOL = new Map(TOOLS.map((t) => [t.key, t.tool]))

/** Keyboard shortcuts (tools, undo, clipboard, rotate, delete, deselect) — edit only. */
export const useEditorShortcuts = (readOnly: boolean) => {
  const store = useEditorStoreApi()
  useEffect(() => {
    if (readOnly) return
    const onKey = (e: KeyboardEvent) => {
      // Undo / redo: ⌘Z / ⇧⌘Z (Ctrl on Windows/Linux), plus ⌘Y.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !isTypingTarget(e.target)) {
        const k = e.key.toLowerCase()
        // The command search: ⌘K (Ctrl+K).
        if (k === "k") {
          e.preventDefault()
          return store.getState().setCommandSearchOpen(true)
        }
        if (k === "z" || k === "y") {
          e.preventDefault()
          if (k === "y" || e.shiftKey) store.getState().redo()
          else store.getState().undo()
          return
        }
        // Clipboard + duplicate for the selection (furniture).
        if (k === "c") return store.getState().copySelection()
        if (k === "v") return store.getState().paste()
        if (k === "d") {
          e.preventDefault() // not the browser's bookmark shortcut
          return store.getState().duplicateSelection()
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const s = store.getState()

      const mapped = KEY_TO_TOOL.get(e.key)
      if (mapped) {
        s.setTool(mapped)
        return
      }

      if (e.key === "m" || e.key === "M") {
        s.toggleMeasureHints()
        return
      }

      if (e.key === "r" || e.key === "R") {
        // Rotate the selected furniture (each piece in place); with nothing
        // turnable selected (or a wall/door), rotate the next placement.
        const sel = s.objects.find((o) => o.id === s.selectedId)
        if (sel && !isEdgeType(sel.type)) s.rotateSelection()
        else s.rotatePlacement()
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (s.selection.length) {
          e.preventDefault()
          s.removeSelection()
        }
        return
      }

      if (e.key === "Escape") {
        s.select(null)
        s.setTool("select")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [readOnly, store])
}
