import type { SceneObject } from "../types"
import { isWall } from "../types"
import { GhostObject } from "../building/GhostObject"
import { GhostWalls } from "../building/GhostWalls"

const BLOCKED = "#ef4444"

/** A saved room about to be placed: its walls merged, as they'll stand, and its pieces — red where it doesn't fit. */
export const KitGhost = ({ plan, doesFit }: { plan: SceneObject[]; doesFit: boolean }) => (
  <>
    <GhostWalls
      edges={plan.flatMap((piece) =>
        isWall(piece.type)
          ? [{ ...piece, type: piece.type, tint: doesFit ? undefined : BLOCKED }]
          : []
      )}
    />
    {plan
      .filter((piece) => !isWall(piece.type))
      .map((piece, i) => (
        <GhostObject
          key={i}
          type={piece.type}
          x={piece.x}
          z={piece.z}
          rotation={piece.rotation}
          color={piece.color}
          tint={doesFit ? undefined : BLOCKED}
        />
      ))}
  </>
)
