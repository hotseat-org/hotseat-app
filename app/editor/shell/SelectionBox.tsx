import { useEditorStore } from "../store"

/** The rubber-band rectangle of an in-progress box selection (client pixels). */
export const SelectionBox = () => {
  const box = useEditorStore((state) => state.box)
  if (!box) return null

  const width = Math.abs(box.endX - box.startX)
  const height = Math.abs(box.endY - box.startY)

  if (width < 4 && height < 4) return null

  return (
    <div
      className="fixed rounded-sm border border-accent bg-accent/10"
      style={{
        left: Math.min(box.startX, box.endX),
        top: Math.min(box.startY, box.endY),
        width,
        height,
      }}
    />
  )
}
