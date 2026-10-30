import type { SceneObject } from "../types"
import { isWall } from "../types"
import { GhostObject } from "./GhostObject"
import { GhostWalls } from "./GhostWalls"

const BLOCKED = "#ef4444"

/** A saved room about to be placed: its walls merged, as they'll stand, and its pieces — red where it doesn't fit. */
export const KitGhost = ({ plan, doesFit }: { plan: SceneObject[]; doesFit: boolean }) => (
  <>
    <GhostWalls
      edges={plan.flatMap((o) =>
        isWall(o.type) ? [{ ...o, type: o.type, tint: doesFit ? undefined : BLOCKED }] : []
      )}
    />
    {plan
      .filter((o) => !isWall(o.type))
      .map((o, i) => (
        <GhostObject
          key={i}
          type={o.type}
          x={o.x}
          z={o.z}
          rotation={o.rotation}
          color={o.color}
          tint={doesFit ? undefined : BLOCKED}
        />
      ))}
  </>
)
