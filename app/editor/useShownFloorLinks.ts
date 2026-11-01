import { useMemo, useRef } from "react"
import { getFloorLinks, type FloorLinks } from "./floorLinks"
import { useAllPieces, useEditorStore } from "./store"
import type { SceneObject } from "./types"

/** What the links are drawn from: their kinds, places and looks. */
const getLinksSignature = (pieces: SceneObject[]) =>
  pieces
    .map(
      (piece) =>
        `${piece.id}:${piece.type}:${piece.x}:${piece.z}:${piece.rotation}:${piece.color ?? ""}`
    )
    .join("|")

/** The shown floor's ways to others, kept while they're the same (the floor's tiles key on them). */
export const useShownFloorLinks = () => {
  const pieces = useAllPieces()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const known = useRef<{ signature: string; links: FloorLinks } | null>(null)

  return useMemo(() => {
    const links = getFloorLinks(pieces, floors, currentFloor)
    const signature = getLinksSignature([...links.arrivingStairs, ...links.passingLifts])
    if (known.current?.signature !== signature) known.current = { signature, links }

    return known.current.links
  }, [pieces, floors, currentFloor])
}
