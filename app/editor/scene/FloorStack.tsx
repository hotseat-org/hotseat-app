import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react"
import type { Group } from "three"
import { GROUND_SIZE } from "../landscape/Ground"
import { Contours } from "../landscape/Contours"
import { markShadowsDirty } from "../lighting/shadows"
import { STOREY } from "../objects/dimensions"
import { FloorBaseContext, shownFloorUniform } from "../objects/floorHeight"
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

/** What a floor below is drawn from: its pieces' kinds, places and looks. */
const getPiecesSignature = (pieces: SceneObject[]) =>
  pieces
    .map((piece) => `${piece.type}:${piece.x}:${piece.z}:${piece.rotation}:${piece.color ?? ""}`)
    .join("|")

/**
 * The shown floor sits at height 0 — where everything is placed and drawn —
 * so the floors below sit one storey lower each, down to the ground. Their
 * order, and the ground floor's pieces (the land is shaped round them).
 * Each floor keeps the same list of pieces while they're the same, however
 * often floors are switched: its walls, ceiling and the land aren't worked
 * out again (they were, every switch — the land is the slowest of all).
 */
const useFloorLevels = () => {
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const objects = useEditorStore((state) => state.objects)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)
  const known = useRef(new Map<string, { signature: string; pieces: SceneObject[] }>())

  return useMemo(() => {
    const getStable = (floorId: string, pieces: SceneObject[]) => {
      const signature = getPiecesSignature(pieces)
      const previous = known.current.get(floorId)
      if (previous?.signature === signature) return previous.pieces

      known.current.set(floorId, { signature, pieces })

      return pieces
    }
    const level = floors.findIndex((floor) => floor.id === currentFloor)
    const below = floors.slice(0, level).map((floor, floorLevel) => ({
      id: floor.id,
      level: floorLevel,
      pieces: getStable(
        floor.id,
        otherFloorsPieces.filter((piece) => piece.floor === floor.id)
      ),
    }))
    const groundPieces = level === 0 ? getStable(floors[0].id, objects) : (below[0]?.pieces ?? [])

    return { level, below, groundPieces }
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
          {/* Kept (see Surface): its shader serves every upper floor. */}
          <meshStandardMaterial
            color={surfaces.floor}
            roughness={0.95}
            fog={false}
            dispose={null}
          />
        </mesh>
      )}
      <Contours isEditing={isEditing} pieces={groundPieces} />

      {below.map(({ id, level: floorLevel, pieces }) => (
        <group key={id} position-y={floorLevel * STOREY - SETTLE}>
          {/* Shaded by height above its own floor, not the shown one's. */}
          <FloorBaseContext.Provider value={(floorLevel - level) * STOREY - SETTLE}>
            <LowerFloor pieces={pieces} />
          </FloorBaseContext.Provider>
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

  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const get = useThree((state) => state.get)
  const setFrameloop = useThree((state) => state.setFrameloop)

  // Before the frame with the new floor: it's drawn where the old one was —
  // and held there while its shaders compile (in the background where the
  // browser can: the page stays responsive), then it glides. Drawn at once,
  // a floor's first frame compiled them all in one long stall, mid-glide.
  useLayoutEffect(() => {
    if (level === previousLevel.current) return

    const from = (level - previousLevel.current) * STOREY
    previousLevel.current = level
    shift.current = { from, startedAt: Infinity }
    if (group.current) group.current.position.y = from

    shownFloorUniform.value = from

    let isCancelled = false
    const { frameloop } = get()
    setFrameloop("never")
    renderer
      .compileAsync(scene, camera)
      .catch(() => {}) // compiled on the first frame instead, as before
      .finally(() => {
        if (isCancelled) return

        shift.current.startedAt = performance.now()
        setFrameloop(frameloop)
        invalidate()
      })

    return () => {
      isCancelled = true
      setFrameloop(frameloop)
    }
  }, [level, renderer, scene, camera, get, setFrameloop, invalidate])

  // Gone mid-glide: the surfaces are shaded and cut from the ground again.
  useEffect(
    () => () => {
      shownFloorUniform.value = 0
    },
    []
  )

  useFrame(() => {
    const world = group.current
    if (!world || world.position.y === 0 || shift.current.startedAt === Infinity) return

    const progress = Math.min(1, (performance.now() - shift.current.startedAt) / SHIFT_DURATION)
    const eased = 1 - (1 - progress) ** 3
    world.position.y = progress === 1 ? 0 : shift.current.from * (1 - eased)
    shownFloorUniform.value = world.position.y
    // The shadows move with it (they're cached, see shadows.ts); next frame too.
    markShadowsDirty(renderer, invalidate)
  })

  return <group ref={group}>{children}</group>
}
