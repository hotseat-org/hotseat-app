import { useEditorStore } from "./store"

/** The rubber-band rectangle of an in-progress box selection (client pixels). */
export const SelectionBox = () => {
  const box = useEditorStore((state) => state.box)
  if (!box) return null

  const width = Math.abs(box.x1 - box.x0)
  const height = Math.abs(box.y1 - box.y0)

  if (width < 4 && height < 4) return null

  return (
    <div
      className="fixed rounded-sm border border-accent bg-accent/10"
      style={{ left: Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width, height }}
    />
  )
}
