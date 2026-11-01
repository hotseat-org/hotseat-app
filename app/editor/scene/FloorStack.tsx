import { useFrame, useThree } from "@react-three/fiber"
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react"
import type { Group } from "three"
import { GROUND_SIZE } from "../landscape/Ground"
import { Contours } from "../landscape/Contours"
import { markShadowsDirty } from "../lighting/shadows"
import { STOREY } from "../objects/dimensions"
import { useEditorStore } from "../store"
import { getRenderer } from "../catalog/rendering"
import { ObjectRenderer } from "../objects/ObjectRenderer"
import { isEdgeType, isMarker, type SceneObject } from "../types"
import { Posts } from "../walls/Posts"
import { Walls } from "../walls/Walls"
import { InteriorFloor } from "./InteriorFloor"
import { useSurfaces } from "./sceneTheme"

/**
 * How far a floor below settles: its wall tops a hair under the shown
 * floor's level, where its own rooms and the build grid lie (the same plane
 * flickers). The walls above sink further into them: still no seam.
 */
const SETTLE = 0.01
/**
 * How far a ceiling sits over its walls' tops — they'd show through it as
 * dashes — still under the shown floor's own rooms (0.006 up).
 */
const CEILING_RISE = 0.005
/** How long the world takes to glide to another floor (ms). */
const SHIFT_DURATION = 450

/**
 * The shown floor sits at height 0 — where everything is placed and drawn —
 * so the floors below sit one storey lower each, down to the ground. Their
 * order, and the ground floor's pieces (the land is shaped round them).
 */
const useFloorLevels = () => {
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const objects = useEditorStore((state) => state.objects)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)

  return useMemo(() => {
    const level = floors.findIndex((floor) => floor.id === currentFloor)
    const below = floors.slice(0, level).map((floor, floorLevel) => ({
      id: floor.id,
      level: floorLevel,
      pieces: otherFloorsPieces.filter((piece) => piece.floor === floor.id),
    }))

    return { level, below, groundPieces: level === 0 ? objects : (below[0]?.pieces ?? []) }
  }, [floors, currentFloor, objects, otherFloorsPieces])
}

/**
 * What's under the shown floor: the ground and its land, at ground level
 * (the same land from every floor — the ground floor's), and the floors
 * below by their walls, each with its ceiling over its rooms: where the
 * floors above stand, and this one can be built on, like the Sims.
 */
export const FloorsBelow = ({ isEditing }: { isEditing: boolean }) => {
  const { level, below, groundPieces } = useFloorLevels()
  const surfaces = useSurfaces()

  return (
    <group position-y={-level * STOREY}>
      {/* On the ground floor, the ground is the shown floor's own (see Ground). */}
      {level > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
          <meshStandardMaterial color={surfaces.floor} roughness={0.95} fog={false} />
        </mesh>
      )}
      <Contours isEditing={isEditing} pieces={groundPieces} />

      {below.map(({ id, level: floorLevel, pieces }) => (
        <group key={id} position-y={floorLevel * STOREY - SETTLE}>
          <LowerFloor pieces={pieces} />
          {/* Its ceiling, on its walls: from above, its roof — the floor
              above's walls stand on it, and what's built up there. */}
          <group position-y={STOREY + CEILING_RISE}>
            <InteriorFloor pieces={pieces} color={surfaces.ceiling} />
          </group>
        </group>
      ))}
    </group>
  )
}

const ignore = () => {}

/**
 * A floor below: its walls, with their doors and windows — not its furniture,
 * which would only crowd the view of the floor being shown (the ceiling
 * covers its rooms anyway). The openings are drawn one by one, not batched:
 * batched (StaticBatch), they showed up on the floor above.
 */
const LowerFloor = ({ pieces }: { pieces: SceneObject[] }) => {
  const openings = pieces.filter(
    (piece) =>
      isEdgeType(piece.type) && !getRenderer(piece.type).isDrawnAsRun && !isMarker(piece.type)
  )

  return (
    <>
      <Walls pieces={pieces} />
      <Posts pieces={pieces} />
      {openings.map((piece) => (
        <ObjectRenderer
          key={piece.id}
          object={piece}
          selected={false}
          tool="select"
          interactive={false}
          onSelect={ignore}
          onDelete={ignore}
          onStartDrag={ignore}
        />
      ))}
    </>
  )
}

/**
 * Showing another floor, the world glides there: it starts a storey (or
 * more) off, where the floor left stood, and settles — as if the camera rose
 * (or sank) to the new floor. The camera itself stays put.
 */
export const FloorShift = ({ children }: { children: ReactNode }) => {
  const group = useRef<Group>(null)
  const level = useEditorStore((state) =>
    state.floors.findIndex((floor) => floor.id === state.currentFloor)
  )
  const previousLevel = useRef(level)
  const shift = useRef({ from: 0, startedAt: 0 })
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  // Before the frame with the new floor: it's drawn where the old one was.
  useLayoutEffect(() => {
    if (level === previousLevel.current) return

    shift.current = { from: (level - previousLevel.current) * STOREY, startedAt: performance.now() }
    previousLevel.current = level
    if (group.current) group.current.position.y = shift.current.from

    invalidate()
  }, [level, invalidate])

  useFrame(() => {
    const world = group.current
    if (!world || world.position.y === 0) return

    const progress = Math.min(1, (performance.now() - shift.current.startedAt) / SHIFT_DURATION)
    const eased = 1 - (1 - progress) ** 3
    world.position.y = progress === 1 ? 0 : shift.current.from * (1 - eased)
    // The shadows move with it (they're cached, see shadows.ts); next frame too.
    markShadowsDirty(renderer, invalidate)
  })

  return <group ref={group}>{children}</group>
}
