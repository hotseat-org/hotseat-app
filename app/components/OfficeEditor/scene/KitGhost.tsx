import type { SceneObject } from "../types"
import { GhostObject } from "./GhostObject"
import { GhostWalls } from "./GhostWalls"

const BLOCKED = "#ef4444"

/** A saved room about to be placed: its walls merged, as they'll stand, and its pieces — red where it doesn't fit. */
export const KitGhost = ({ plan, doesFit }: { plan: SceneObject[]; doesFit: boolean }) => (
  <>
    <GhostWalls
      edges={plan.flatMap((o) =>
        o.type === "wall" || o.type === "glassWall"
          ? [{ ...o, type: o.type, tint: doesFit ? undefined : BLOCKED }]
          : []
      )}
    />
    {plan
      .filter((o) => o.type !== "wall" && o.type !== "glassWall")
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
