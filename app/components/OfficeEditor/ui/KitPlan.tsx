import { edgeNodes, footprintCells } from "../layout"
import { GRID, isEdgeType, isOpening, isOverhead, type SceneObject } from "../types"

/** Room around the drawing (m). */
const PAD = 0.4

/**
 * A kit's floor plan, from above: walls as lines (doors and windows lighter),
 * furniture as footprints — enough to tell one saved room from another.
 */
export const KitPlan = ({ objects, className }: { objects: SceneObject[]; className?: string }) => {
  const edges = objects.filter((o) => isEdgeType(o.type))
  const pieces = objects.filter((o) => !isEdgeType(o.type) && !isOverhead(o.type))
  const nodes = edges.flatMap(edgeNodes)
  const xs = [...nodes.map((n) => n.x), ...pieces.map((o) => o.x)]
  const zs = [...nodes.map((n) => n.z), ...pieces.map((o) => o.z)]
  const minX = Math.min(...xs) - PAD
  const minZ = Math.min(...zs) - PAD
  const width = Math.max(...xs) + PAD - minX
  const depth = Math.max(...zs) + PAD - minZ
  return (
    <svg
      viewBox={`${minX} ${minZ} ${width} ${depth}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {pieces.map((o) => {
        const [w, d] = footprintCells(o.type, o.rotation)
        return (
          <rect
            key={o.id}
            x={o.x - (w * GRID) / 2}
            y={o.z - (d * GRID) / 2}
            width={w * GRID}
            height={d * GRID}
            rx={0.1}
            className="fill-accent/40"
          />
        )
      })}
      {/* One layer, then faded: segments overlapping at their ends don't darken. */}
      <g opacity={0.8}>
        {edges.map((o) => {
          const [a, b] = edgeNodes(o)
          return (
            <line
              key={o.id}
              x1={a.x}
              y1={a.z}
              x2={b.x}
              y2={b.z}
              strokeWidth={0.22}
              strokeLinecap="square"
              className={isOpening(o.type) ? "stroke-muted" : "stroke-foreground"}
            />
          )
        })}
      </g>
    </svg>
  )
}
