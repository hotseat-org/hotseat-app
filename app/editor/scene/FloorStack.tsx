import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react"
import type { Group } from "three"
import { GROUND_SIZE } from "../landscape/Ground"
import { Contours } from "../landscape/Contours"
import { markShadowsDirty } from "../lighting/shadows"
import { STOREY } from "../objects/dimensions"
import { FloorPlaceContext, groundUniform, shownFloorUniform } from "../objects/floorHeight"
import { useAllPieces, useEditorStore } from "../store"
import { getRenderer } from "../catalog/rendering"
import { getFloorLink } from "../catalog"
import { getStairsWalledSides, isFloorLink } from "../floorLinks"
import { useShownFloorLinks } from "../useShownFloorLinks"
import { STAIRS, StairsLanding } from "../objects/Stairs"
import { FloorPiecesContext } from "../objects/pieceContext"
import { useFloorLinkClick } from "../useFloorLinkClick"
import { ObjectRenderer } from "../objects/ObjectRenderer"
import { isEdgeType, isMarker, type SceneObject } from "../types"
import { Posts } from "../walls/Posts"
import { Walls } from "../walls/Walls"
import { InteriorFloor } from "./InteriorFloor"
import { useSurfaces } from "./sceneTheme"

/**
 * How far a ceiling sits under its walls' tops: clear of the shown floor's
 * own rooms (0.006 up) and of the tops (either would flicker). The walls
 * above reach down past those tops, in front of them (see Surface): no seam.
 */
const CEILING_DROP = 0.004
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
/** A floor's stairs (they go up through its ceiling), kept per list of its pieces. */
const stairsByPieces = new WeakMap<SceneObject[], SceneObject[]>()
const getStairs = (pieces: SceneObject[]) => {
  let stairs = stairsByPieces.get(pieces)
  if (!stairs) {
    stairs = pieces.filter((piece) => getFloorLink(piece.type) === "above")
    stairsByPieces.set(pieces, stairs)
  }

  return stairs
}

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
      // Where it stands, from the shown floor (stable: its pieces' shaders key on it).
      place: { base: (floorLevel - level) * STOREY },
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

      {below.map(({ id, level: floorLevel, place, pieces }) => (
        <group key={id} position-y={floorLevel * STOREY}>
          {/* Shaded on its own floor, not the shown one's. */}
          <FloorPlaceContext.Provider value={place}>
            <FloorPiecesContext.Provider value={pieces}>
              <LowerFloor pieces={pieces} />
            </FloorPiecesContext.Provider>
          </FloorPlaceContext.Provider>
          {/* Its ceiling, on its walls: from above, its roof — the floor
              above's walls stand on it, and what's built up there. */}
          <group position-y={STOREY - CEILING_DROP}>
            <InteriorFloor pieces={pieces} color={surfaces.ceiling} holes={getStairs(pieces)} />
          </group>
        </group>
      ))}
    </group>
  )
}

const ignore = () => {}

/**
 * On the shown floor, what comes from others: a guard rail round each
 * opening of stairs coming up from below (none along a wall here), and the
 * shafts of lifts placed on other floors — not editable here (they're edited
 * on their own floor). Viewing, pressing an opening goes down its stairs, and
 * a lift opens its floor buttons (see useFloorLinkClick).
 */
export const ShownFloorLinks = ({ isViewing }: { isViewing: boolean }) => {
  const { arrivingStairs, passingLifts } = useShownFloorLinks()
  const objects = useEditorStore((state) => state.objects)
  const allPieces = useAllPieces()
  const handleLinkClick = useFloorLinkClick()
  const handleLiftClick = (id: string) => {
    const lift = allPieces.find((piece) => piece.id === id)
    if (lift) handleLinkClick(lift)
  }

  return (
    <>
      {arrivingStairs.map((stairs) => (
        <group key={stairs.id} position={[stairs.x, 0, stairs.z]} rotation-y={stairs.rotation}>
          <StairsLanding walledSides={getStairsWalledSides(stairs, objects)} />
          {isViewing && (
            // The opening, pressed: down the stairs.
            <mesh
              visible={false}
              rotation={[-Math.PI / 2, 0, 0]}
              position-y={0.02}
              onClick={(event) => {
                if (event.delta > 4) return

                event.stopPropagation()
                handleLinkClick(stairs)
              }}
            >
              <planeGeometry args={[STAIRS.width, STAIRS.length]} />
            </mesh>
          )}
        </group>
      ))}
      {passingLifts.map((lift) => (
        <ObjectRenderer
          key={lift.id}
          object={lift}
          selected={false}
          tool="select"
          interactive={false}
          onSelect={ignore}
          onDelete={ignore}
          onStartDrag={ignore}
          onViewClick={isViewing ? handleLiftClick : undefined}
        />
      ))}
    </>
  )
}

/**
 * A floor below: its walls, with their doors and windows, and its stairs and
 * lifts (seen through the opening of stairs coming up) — not its furniture,
 * which would only crowd the view of the floor being shown (the ceiling
 * covers its rooms anyway). The openings are drawn one by one, not batched:
 * batched (StaticBatch), they showed up on the floor above.
 */
const LowerFloor = ({ pieces }: { pieces: SceneObject[] }) => {
  const openings = pieces.filter(
    (piece) =>
      (isEdgeType(piece.type) && !getRenderer(piece.type).isDrawnAsRun && !isMarker(piece.type)) ||
      isFloorLink(piece)
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
    if (level === previousLevel.current) {
      // The ground: the shown floor's storeys down.
      groundUniform.value = (group.current?.position.y ?? 0) - level * STOREY

      return
    }

    const from = (level - previousLevel.current) * STOREY
    previousLevel.current = level
    shift.current = { from, startedAt: Infinity }
    if (group.current) group.current.position.y = from

    shownFloorUniform.value = from
    groundUniform.value = from - level * STOREY

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
      groundUniform.value = 0
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
    groundUniform.value = world.position.y - level * STOREY
    // The shadows move with it (they're cached, see shadows.ts); next frame too.
    markShadowsDirty(renderer, invalidate)
  })

  return <group ref={group}>{children}</group>
}
