import { edgeNodes, footprintCells } from "../layout"
import { GRID, isEdgeType, isOpening, isOverhead, type SceneObject } from "../types"

/** Room around the drawing (m). */
const PAD = 0.4

/**
 * A kit's floor plan, from above: walls as lines (doors and windows lighter),
 * furniture as footprints — enough to tell one saved room from another.
 */
export const KitPlan = ({ objects, className }: { objects: SceneObject[]; className?: string }) => {
  const edges = objects.filter((object) => isEdgeType(object.type))
  const pieces = objects.filter((piece) => !isEdgeType(piece.type) && !isOverhead(piece.type))
  const nodes = edges.flatMap(edgeNodes)
  const xCoordinates = [...nodes.map((node) => node.x), ...pieces.map((piece) => piece.x)]
  const zCoordinates = [...nodes.map((node) => node.z), ...pieces.map((piece) => piece.z)]
  const minX = Math.min(...xCoordinates) - PAD
  const minZ = Math.min(...zCoordinates) - PAD
  const width = Math.max(...xCoordinates) + PAD - minX
  const depth = Math.max(...zCoordinates) + PAD - minZ
  return (
    <svg
      viewBox={`${minX} ${minZ} ${width} ${depth}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {pieces.map((piece) => {
        const [cellsWide, cellsDeep] = footprintCells(piece.type, piece.rotation)
        return (
          <rect
            key={piece.id}
            x={piece.x - (cellsWide * GRID) / 2}
            y={piece.z - (cellsDeep * GRID) / 2}
            width={cellsWide * GRID}
            height={cellsDeep * GRID}
            rx={0.1}
            className="fill-accent/40"
          />
        )
      })}
      {/* One layer, then faded: segments overlapping at their ends don't darken. */}
      <g opacity={0.8}>
        {edges.map((edge) => {
          const [start, end] = edgeNodes(edge)
          return (
            <line
              key={edge.id}
              x1={start.x}
              y1={start.z}
              x2={end.x}
              y2={end.z}
              strokeWidth={0.22}
              strokeLinecap="square"
              className={isOpening(edge.type) ? "stroke-muted" : "stroke-foreground"}
            />
          )
        })}
      </g>
    </svg>
  )
}
