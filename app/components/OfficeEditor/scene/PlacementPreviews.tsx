import { furnitureCollides } from "../layout"
import { useEditorStore } from "../store"
import { isObjectType, isWallMounted, type Cell, type ObjectType, type SceneObject } from "../types"
import { AlignmentGuides } from "./AlignmentGuides"
import { GhostObject } from "./GhostObject"
import { MeasureHints } from "./MeasureHints"
import { PlacementHighlight } from "./PlacementHighlight"

const BLOCKED = "#ef4444"

/**
 * Editing: where pieces would go, before they're put down — a Row / Pod drag's
 * copies, the armed piece under the cursor, the piece being carried, and a
 * piece turned in place into others. Red where blocked; with alignment guides
 * and (when on) measuring hints.
 */
export const PlacementPreviews = ({
  isFurniture,
  hover,
  isRepeatDragging,
  repeatPlan,
  repeatBlocked,
  dragId,
  carried,
}: {
  /** A furniture tool is armed. */
  isFurniture: boolean
  /** Where the armed piece would go (wall items also carry the way they face). */
  hover: (Cell & { rotation?: number }) | null
  /** A Row / Pod drag is under way: its copies, and which are blocked. */
  isRepeatDragging: boolean
  repeatPlan: { x: number; z: number; rotation: number }[]
  repeatBlocked: boolean[]
  /** The piece being carried (its id, and it). */
  dragId: string | null
  carried: SceneObject | undefined
}) => {
  const objects = useEditorStore((s) => s.objects)
  const tool = useEditorStore((s) => s.tool)
  const placementRotation = useEditorStore((s) => s.placementRotation)
  const placementColor = useEditorStore((s) =>
    isObjectType(s.tool) ? s.placementColors[s.tool] : undefined
  )
  const measureHints = useEditorStore((s) => s.measureHints)
  const pendingTurnId = useEditorStore((s) => s.pendingTurn?.id)
  const turnedInto =
    pendingTurnId && pendingTurnId !== dragId
      ? objects.find((o) => o.id === pendingTurnId)
      : undefined
  const type = tool as ObjectType
  // The armed piece under the cursor — not while carrying or laying a row.
  const shown = isFurniture && !dragId && !isRepeatDragging ? hover : null
  const rotation = shown?.rotation ?? placementRotation
  const isHoverBlocked = !!shown && furnitureCollides(objects, type, shown.x, shown.z, rotation)

  return (
    <>
      {/* Row / Pod: every copy the drag would lay — red where blocked. */}
      {isRepeatDragging &&
        repeatPlan.map((p, i) => (
          <GhostObject
            key={i}
            type={type}
            x={p.x}
            z={p.z}
            rotation={p.rotation}
            tint={repeatBlocked[i] ? BLOCKED : undefined}
            color={placementColor ?? undefined}
          />
        ))}

      {/* Furniture build preview — red when it would overlap something */}
      {shown && (
        <>
          <PlacementHighlight
            type={type}
            x={shown.x}
            z={shown.z}
            rotation={rotation}
            valid={!isHoverBlocked}
          />
          <AlignmentGuides
            objects={objects}
            type={type}
            x={shown.x}
            z={shown.z}
            rotation={rotation}
          />
          {measureHints && (
            <MeasureHints
              objects={objects}
              type={type}
              x={shown.x}
              z={shown.z}
              rotation={rotation}
            />
          )}
          <GhostObject
            type={type}
            x={shown.x}
            z={shown.z}
            rotation={rotation}
            tint={isHoverBlocked ? BLOCKED : undefined}
            color={placementColor ?? undefined}
          />
        </>
      )}

      {/* Lines where the carried piece lines up with others. */}
      {carried && !isWallMounted(carried.type) && (
        <AlignmentGuides
          objects={objects}
          type={carried.type}
          x={carried.x}
          z={carried.z}
          rotation={carried.rotation}
          ignoreId={carried.id}
        />
      )}
      {/* Target-square highlight for the object being carried */}
      {carried && measureHints && (
        <MeasureHints
          objects={objects}
          type={carried.type}
          x={carried.x}
          z={carried.z}
          rotation={carried.rotation}
          ignoreId={carried.id}
        />
      )}
      {/* Turned in place into others: red until it's turned free (or let go,
          when it springs back). */}
      {turnedInto && (
        <PlacementHighlight
          type={turnedInto.type}
          x={turnedInto.x}
          z={turnedInto.z}
          rotation={turnedInto.rotation}
          valid={false}
        />
      )}
      {carried && (
        <PlacementHighlight
          type={carried.type}
          x={carried.x}
          z={carried.z}
          rotation={carried.rotation}
          valid={
            !furnitureCollides(
              objects,
              carried.type,
              carried.x,
              carried.z,
              carried.rotation,
              carried.id
            )
          }
        />
      )}
    </>
  )
}
