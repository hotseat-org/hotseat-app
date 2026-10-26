import { OrbitControls, OrthographicCamera } from "@react-three/drei"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useThree, type ThreeEvent } from "@react-three/fiber"
import { MOUSE, Plane, Vector3 } from "three"
import { useEditorStore, useEditorStoreApi, useObjectsWithPaintPreview } from "../store"
import {
  composeRepeat,
  composeWallColors,
  furnitureCollides,
  snapPlacement,
  wallMount,
} from "../layout"
import { randomModelId } from "../models"
import { daylight, DaylightContext } from "../daylight"
import { SURFACES } from "../palette"
import { SceneThemeContext } from "../sceneTheme"
import { useDesksOnDay } from "../useBooking"
import {
  isMarker,
  isObjectType,
  isSeatable,
  isWall,
  isWallMounted,
  type Cell,
  type ObjectType,
  type SceneObject,
} from "../types"
import { ObjectRenderer } from "../objects/ObjectRenderer"
import { StaticBatch } from "../objects/StaticBatch"
import { CURSORS, CursorHintContext, getToolCursor, type CursorHint } from "../cursors"
import { canPlaceKit, composeKitAt } from "../kits"
import { PlacementHighlight } from "./PlacementHighlight"
import { markShadowsDirty } from "./shadows"
import { Lighting } from "./Lighting"
import { StudioEnvironment } from "./StudioEnvironment"
import { PostFx } from "./PostFx"
import { ShaderWarmup } from "./ShaderWarmup"
import { Ground } from "./Ground"
import { Contours } from "./Contours"
import { RouteLine } from "./RouteLine"
import { HeatBars } from "./HeatBars"
import { HeatPads } from "./HeatPads"
import { CAMERA_OFFSET } from "./viewCentre"
import { InteriorFloor } from "./InteriorFloor"
import { ContactBlobs } from "./ContactBlobs"
import { WindowLight } from "./WindowLight"
import { Halos } from "./Halos"
import { GhostObject } from "./GhostObject"
import { GhostWalls } from "./GhostWalls"
import { Posts } from "./Posts"
import { Walls } from "./Walls"
import { BuildController } from "./BuildController"
import { CarryController } from "./CarryController"
import { CameraControls, type FloorPan } from "./CameraControls"
import { WallXray } from "./WallXray"
import { WallResize, type WallResizeHandle } from "./WallResize"
import { RoomLabels } from "./RoomLabels"
import { ZoneFloor } from "./ZoneFloor"
import { CameraFit, type FitInsets } from "./CameraFit"
import { SeatTags } from "./SeatTags"
import { SeatPopup } from "./SeatPopup"
import { BoxSelect } from "./BoxSelect"
import { PaintController } from "./PaintController"
import { NudgeKeys } from "./NudgeKeys"
import { OpeningCarry } from "./OpeningCarry"
import { DeskPets } from "./DeskPets"
import { MeasureHints } from "./MeasureHints"
import { AlignmentGuides } from "./AlignmentGuides"
import { aimAtWallHeight } from "./wallAim"

interface Props {
  /** Display mode: render the office but disable all editing interaction. */
  readOnly?: boolean
  /** App theme is dark → deep slate surfaces (lighting stays bright). */
  dark?: boolean
  /** Screen space the floating panels cover (px): Fit frames the office beside them. */
  fitInsets?: FitInsets
}

// Same camera drags in both modes: right-drag orbits, middle-drag (or
// Shift/⌘/Ctrl + right-drag — OrbitControls' built-in modifier) pans. Edit mode
// keeps the left button for building/selecting; display mode has nothing to
// build, so left-drag pans there, like the simple view. Wheel, trackpad,
// Space-drag and keys: CameraControls.
type Buttons = { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE }
const EDIT_BUTTONS = { LEFT: -1, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE } as unknown as Buttons
const VIEW_BUTTONS: Buttons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }

const FURNITURE = new Set([
  "desk",
  "seat",
  "plant",
  "workstation",
  "deskmate",
  "sofa",
  "coffeeTable",
  "meetingTable",
  "bookshelf",
  "rug",
  "cooler",
  "filingCabinet",
  "lockers",
  "printer",
  "tvScreen",
  "whiteboard",
  "vendingMachine",
  "floorLamp",
  "trashBin",
  "kitchenCounter",
  "fridge",
  "armchair",
  "ceilingLight",
  "wardrobe",
  "barStool",
  "barTable",
  "toilet",
  "shower",
  "bathroomSink",
  "roundTable",
  "squareTable",
  "ovalTable",
  "ovalBarTable",
  "serverRack",
  "shelvingUnit",
  "wallTv",
  "wallArt",
  "wallClock",
  "wallShelf",
  "coatRack",
  "planterBox",
  "divider",
])

/** The floor plane: where a grabbed piece is held from. */
const GROUND = new Plane(new Vector3(0, 1, 0), 0)
/** A press that travels further than this (px) drags the piece; less is a click. */
const DRAG_PX = 4
/** A right-press that moves more than this (px) orbits: no menu. */
const MENU_SLOP = 6

export const Scene = ({ readOnly = false, dark = false, fitInsets }: Props) => {
  const objects = useEditorStore((s) => s.objects)
  // Doors and windows wear their wall line's paint (or the Paint tool's, hovered).
  const paintedObjects = useObjectsWithPaintPreview()
  const wallColors = useMemo(() => composeWallColors(paintedObjects), [paintedObjects])
  const selection = useEditorStore((s) => s.selection)
  const tool = useEditorStore((s) => s.tool)
  const placementRotation = useEditorStore((s) => s.placementRotation)
  const placementColors = useEditorStore((s) => s.placementColors)
  const measureHints = useEditorStore((s) => s.measureHints)
  const layers = useEditorStore((s) => s.layers)
  const placementColor = isObjectType(tool) ? placementColors[tool] : undefined
  const timeOfDay = useEditorStore((s) => s.timeOfDay)
  const surfaces = dark ? SURFACES.dark : SURFACES.light
  const profile = daylight(timeOfDay, surfaces.nightDepth)
  // Where the office stands and how far it reaches from there (both to whole
  // metres, so small edits don't refit): the sun and its shadows aim there.
  const officeArea = useMemo((): { centre: [number, number]; reach: number } => {
    if (!objects.length) return { centre: [0, 0], reach: 0 }
    let x0 = Infinity
    let z0 = Infinity
    let x1 = -Infinity
    let z1 = -Infinity
    for (const o of objects) {
      x0 = Math.min(x0, o.x)
      z0 = Math.min(z0, o.z)
      x1 = Math.max(x1, o.x)
      z1 = Math.max(z1, o.z)
    }
    return {
      centre: [Math.round((x0 + x1) / 2), Math.round((z0 + z1) / 2)],
      reach: Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2),
    }
  }, [objects])
  const addObject = useEditorStore((s) => s.addObject)
  const removeObject = useEditorStore((s) => s.removeObject)
  const select = useEditorStore((s) => s.select)
  const toggleSelect = useEditorStore((s) => s.toggleSelect)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)

  // Cached shadows (see shadows.ts): redraw the shadow maps only when what casts
  // them changes — the layout, the time of day, the theme or the mode. (Pieces
  // that move or re-shape on their own mark them too.) Not on every store
  // update: a desk card or a route is no reason to redraw every shadow.
  const gl = useThree((s) => s.gl)
  const raycaster = useThree((s) => s.raycaster)
  const pointer = useThree((s) => s.pointer)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const storeApi = useEditorStoreApi()
  // The desk card lives in the scene (follows its desk); just close it when
  // switching modes.
  useEffect(() => {
    storeApi.getState().closeSeatCard()
  }, [readOnly, storeApi])
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false
    markShadowsDirty(gl, invalidate)
    return storeApi.subscribe((state, prev) => {
      if (state.objects !== prev.objects || state.timeOfDay !== prev.timeOfDay)
        markShadowsDirty(gl, invalidate)
    })
  }, [gl, invalidate, storeApi])
  useLayoutEffect(() => markShadowsDirty(gl, invalidate), [gl, invalidate, dark, readOnly])

  // Where the armed piece would go (wall items also carry the way they face).
  const [hover, setHover] = useState<(Cell & { rotation?: number }) | null>(null)
  // A saved room on the cursor: where it'd land, and whether it fits there.
  const armedKit = useEditorStore((s) => s.armedKit)
  const kitPlan = useMemo(
    () => (armedKit && hover ? composeKitAt(armedKit, hover.x, hover.z) : null),
    [armedKit, hover]
  )
  const doesKitFit = useMemo(() => !!kitPlan && canPlaceKit(objects, kitPlan), [kitPlan, objects])
  // Row / Pod placement: where the drag began and where it is now.
  const placementPattern = useEditorStore((s) => s.placementPattern)
  const [repeat, setRepeat] = useState<{ start: Cell & { rotation?: number }; end: Cell } | null>(
    null
  )
  const [dragId, setDragId] = useState<string | null>(null)
  // A door/window lifted out of its wall, being carried to a new spot.
  const [carriedOpening, setCarriedOpening] = useState<SceneObject | null>(null)
  const carriedOpeningRef = useRef(carriedOpening)
  carriedOpeningRef.current = carriedOpening
  const pickOpening = (id: string) => {
    if (dragId || carriedOpening) return
    storeApi.getState().beginBatch() // lift → carry → drop = one undo step
    const o = storeApi.getState().liftOpening(id)
    if (o) setCarriedOpening(o)
    else storeApi.getState().endBatch()
  }
  // Put a carried opening back where it came from (Esc, tool/mode switch,
  // unmount) — never leave it lifted out of the layout.
  const restoreOpening = () => {
    const o = carriedOpeningRef.current
    if (!o) return
    storeApi.getState().placeOpening(o, o.x, o.z)
    setCarriedOpening(null)
    storeApi.getState().endBatch()
  }
  useEffect(() => restoreOpening, [])
  useEffect(() => {
    restoreOpening()
  }, [tool, readOnly])
  useEffect(() => {
    if (!carriedOpening) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && restoreOpening()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [carriedOpening])
  const isFurniture = FURNITURE.has(tool)
  // Row / Pod placement (wall items hang one at a time).
  const isRepeating =
    isFurniture && placementPattern !== "single" && !isWallMounted(tool as ObjectType)
  // The copies the current drag would lay, each blocked or not (as addObjects
  // would decide: against the office and the copies before it).
  const repeatPlan = useMemo(() => {
    if (!repeat || placementPattern === "single") return []
    return composeRepeat(
      tool as ObjectType,
      repeat.start.rotation ?? placementRotation,
      repeat.start,
      repeat.end,
      placementPattern
    )
  }, [repeat, placementPattern, tool, placementRotation])
  const repeatBlocked = useMemo(() => {
    const placed: SceneObject[] = []
    return repeatPlan.map((p) => {
      const isBlocked = furnitureCollides(
        [...objects, ...placed],
        tool as ObjectType,
        p.x,
        p.z,
        p.rotation
      )
      if (!isBlocked) placed.push({ id: `plan-${placed.length}`, type: tool as ObjectType, ...p })
      return isBlocked
    })
  }, [repeatPlan, objects, tool])

  // Leaving edit mode puts back whatever was being dragged (it'd keep
  // following the cursor in the read-only view otherwise).
  useEffect(() => {
    if (readOnly) handlers.current.putBack()
  }, [readOnly])

  // Snapped placement spot, kept fully on the buildable floor. Wall items snap
  // onto the nearest wall face instead (facing out); off a wall they stay put
  // and read as blocked.
  const placeAt = (type: ObjectType, x: number, z: number): Cell & { rotation?: number } => {
    if (isWallMounted(type)) {
      const aim = aimAtWallHeight(raycaster, pointer, camera) ?? { x, z }
      const m = wallMount(objects, type, aim.x, aim.z)
      if (m) return m
    }
    return snapPlacement(objects, type, placementRotation, x, z)
  }

  // View mode: who's in at each desk on the shown day (clutter, monitor, pet).
  const { desks } = useDesksOnDay()
  const occupied = useMemo(
    () => (readOnly ? new Map(desks.map((d) => [d.desk.id, d.state.kind !== "free"])) : null),
    [readOnly, desks]
  )
  // Last refused drop (a timestamp) — the carried object shakes "no".
  const [blockedAt, setBlockedAt] = useState(0)
  // Tell the store what's being carried (R then rotates it freely).
  useEffect(() => {
    storeApi.getState().setCarrying(dragId)
  }, [dragId, storeApi])

  // Moving furniture: press on a piece and drag it — a plain click only
  // selects. It's held by the spot you grabbed (no jump), and released over a
  // free spot it stays; over other furniture (or on Esc) it goes back.
  /** Where the dragged piece started — what Esc / a refused drop restores. */
  const dragStart = useRef<{ id: string; x: number; z: number; rotation: number } | null>(null)
  /** The grab point's offset from the piece's centre (plan units). */
  const [grab, setGrab] = useState({ dx: 0, dz: 0 })

  const endDrag = () => {
    dragStart.current = null
    setDragId(null)
    storeApi.getState().endBatch() // the whole drag = one undo step (none if put back)
  }

  const putBack = () => {
    const start = dragStart.current
    if (!start) return
    storeApi.getState().moveObject(start.id, start.x, start.z, start.rotation)
    endDrag()
  }

  const tryDrop = () => {
    const start = dragStart.current
    if (!start) return
    const all = storeApi.getState().objects
    const o = all.find((obj) => obj.id === start.id)
    if (o && furnitureCollides(all, o.type, o.x, o.z, o.rotation, o.id)) {
      setBlockedAt(performance.now())
      return putBack()
    }
    endDrag()
  }

  const handlePick = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (dragStart.current) return
    const o = storeApi.getState().objects.find((obj) => obj.id === id)
    if (!o) return
    const hit = e.ray.intersectPlane(GROUND, new Vector3())
    const offset = hit ? { dx: o.x - hit.x, dz: o.z - hit.z } : { dx: 0, dz: 0 }
    const { clientX: x0, clientY: y0 } = e.nativeEvent
    const move = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) <= DRAG_PX) return
      window.removeEventListener("pointermove", move)
      dragStart.current = { id, x: o.x, z: o.z, rotation: o.rotation }
      setGrab(offset)
      storeApi.getState().beginBatch()
      setDragId(id)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      handlers.current.tryDrop()
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  // Esc while dragging: back where it was.
  useEffect(() => {
    if (!dragId) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handlers.current.putBack()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dragId])

  // Stable handles for the (memoized) pieces — the real handlers change with
  // every render (they close over what's being carried).
  const handlers = useRef({ handlePick, pickOpening, tryDrop, putBack })
  handlers.current = { handlePick, pickOpening, tryDrop, putBack }
  const onStartDrag = useCallback(
    (id: string, e: ThreeEvent<PointerEvent>) => handlers.current.handlePick(id, e),
    []
  )
  const onPickOpening = useCallback((id: string) => handlers.current.pickOpening(id), [])

  // Right-click menu. A right-drag orbits the camera, so the menu opens on the
  // release, only when the pointer barely moved — and a press on a piece the
  // selection doesn't hold selects it first.
  const menuPress = useRef<{ targetId: string | null; point: Cell; x: number; y: number } | null>(
    null
  )
  const pressMenu = useCallback((targetId: string | null, point: Cell, e: PointerEvent) => {
    menuPress.current = { targetId, point, x: e.clientX, y: e.clientY }
  }, [])
  const onMenuPress = useCallback(
    (id: string, e: ThreeEvent<PointerEvent>) =>
      pressMenu(id, { x: e.point.x, z: e.point.z }, e.nativeEvent),
    [pressMenu]
  )
  useEffect(() => {
    if (readOnly) return
    const handleMove = (e: PointerEvent) => {
      const press = menuPress.current
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MENU_SLOP)
        menuPress.current = null
    }
    const handleUp = (e: PointerEvent) => {
      const press = menuPress.current
      menuPress.current = null
      if (!press || e.button !== 2) return
      const s = storeApi.getState()
      if (press.targetId && !s.selection.includes(press.targetId)) {
        s.setTool("select")
        s.select(press.targetId)
      }
      s.openContextMenu({
        x: e.clientX,
        y: e.clientY,
        targetId: press.targetId,
        point: press.point,
      })
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [readOnly, storeApi])

  const floorPan = useRef<FloorPan | null>(null)
  const wallResize = useRef<WallResizeHandle>(null)
  // Hovered pieces' cursor hints, forwarded to CameraControls (a stable
  // callback, so hovering never re-renders the scene).
  const cursorHintRef = useRef<((id: string, hint: CursorHint | null) => void) | null>(null)
  const setCursorHint = useCallback(
    (id: string, hint: CursorHint | null) => cursorHintRef.current?.(id, hint),
    []
  )
  // The current press began on bare floor. Objects don't stop pointerup, so the
  // floor hears a release over a piece too; this tells the two apart. Cleared
  // by the window once each press ends (after the scene's own handlers).
  const isFloorPress = useRef(false)
  useEffect(() => {
    const clear = () => (isFloorPress.current = false)
    window.addEventListener("pointerup", clear)
    return () => window.removeEventListener("pointerup", clear)
  }, [])
  // Wall + Erase tools are owned by BuildController; here we handle select and
  // furniture placement only. All no-ops in display mode.
  const handleDown = (x: number, z: number, button: number, e: PointerEvent) => {
    if (!readOnly && button === 2) return pressMenu(null, { x, z }, e)
    if (readOnly || button !== 0) return
    if (dragId) return // mid-drag (another button/finger): the release decides
    if (carriedOpening) return
    // Row / Pod: the drag lays copies (instead of panning).
    if (isRepeating) {
      const start = placeAt(tool as ObjectType, x, z)
      setRepeat({ start, end: start })
      isFloorPress.current = true
      return
    }
    // Bare floor, Select tool + Shift: a box selection, added to the current
    // one — BoxSelect takes over the drag.
    if (tool === "select" && e.shiftKey) {
      storeApi
        .getState()
        .setBox({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, additive: true })
      return
    }
    // A saved room on the cursor: a click places it, a drag pans.
    if (armedKit) {
      isFloorPress.current = true
      floorPan.current?.start(e)
      return
    }
    // Select, at a wall's foot: drag the wall sideways.
    if (tool === "select" && wallResize.current?.press(x, z)) return
    // Otherwise a drag pans (Select, furniture); a click acts on pointerup.
    isFloorPress.current = true
    if (tool === "select" || isFurniture) floorPan.current?.start(e)
  }

  const handleMove = (x: number, z: number) => {
    if (readOnly || dragId) return // carrying is handled by CarryController (plane raycast)
    wallResize.current?.hover(x, z)
    if (repeat) setRepeat({ ...repeat, end: { x, z } })
    if (isFurniture) setHover(placeAt(tool as ObjectType, x, z))
    else setHover({ x, z })
  }

  const handleUp = (x: number, z: number, button: number) => {
    if (readOnly || button !== 0 || dragId) return
    if (repeat) {
      storeApi.getState().addObjects(
        repeatPlan.map((p) => ({
          type: tool as ObjectType,
          ...p,
          color: placementColor ?? undefined,
        }))
      )
      setRepeat(null)
      return
    }
    if (floorPan.current?.hasMoved()) return // that was a pan, not a click
    if (armedKit) {
      if (isFloorPress.current && kitPlan && doesKitFit) storeApi.getState().placeKit(kitPlan)
      return
    }
    if (tool === "select" && isFloorPress.current) select(null) // click on bare floor
    if (isFurniture) {
      const p = placeAt(tool as ObjectType, x, z)
      addObject({
        type: tool as ObjectType,
        x: p.x,
        z: p.z,
        rotation: p.rotation ?? placementRotation,
        color: placementColor ?? undefined,
        // A deskmate gets a random animal on its chair.
        model: tool === "deskmate" ? randomModelId() : undefined,
      })
    }
  }

  const carried = dragId ? objects.find((o) => o.id === dragId) : undefined
  const refusedTurn = useEditorStore((s) => s.refusedTurn)
  const pendingTurnId = useEditorStore((s) => s.pendingTurn?.id)
  const turnedInto =
    pendingTurnId && pendingTurnId !== dragId
      ? objects.find((o) => o.id === pendingTurnId)
      : undefined
  // Canvas cursor between camera gestures: the tool's, a closed hand while
  // carrying a piece, the plain arrow in display mode.
  const cursor = readOnly
    ? CURSORS.select
    : carried || carriedOpening
      ? "grabbing"
      : armedKit
        ? CURSORS.place
        : getToolCursor(tool, isFurniture)

  return (
    <SceneThemeContext.Provider value={surfaces}>
      <CursorHintContext.Provider value={setCursorHint}>
        <DaylightContext.Provider value={profile.nightness}>
          <ShaderWarmup>
            <OrthographicCamera
              makeDefault
              position={CAMERA_OFFSET}
              zoom={46}
              near={0.1}
              far={800}
            />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.12}
              minPolarAngle={0.2}
              maxPolarAngle={1.15}
              minZoom={20}
              maxZoom={120}
              mouseButtons={readOnly ? VIEW_BUTTONS : EDIT_BUTTONS}
              target={[0, 0, 0]}
            />
            <CameraControls
              floorPan={floorPan}
              setCursorHint={cursorHintRef}
              cursor={cursor}
              isHintShown={!carried && !carriedOpening}
              readOnly={readOnly}
            />
            <CameraFit insets={fitInsets} />
            {!readOnly && <WallResize ref={wallResize} setCursorHint={setCursorHint} />}

            {/* See-through, cut-down wall section under the cursor — always in view
            mode; in edit mode while selecting or placing furniture (the wall,
            door and erase tools target walls directly). */}
            <WallXray
              isEditing={!readOnly}
              // Off while hanging or carrying a wall item — you're pointing at
              // the very wall it goes on.
              enabled={
                (readOnly || tool === "select" || isFurniture) &&
                !carriedOpening &&
                !isWallMounted(tool as ObjectType) &&
                !(carried && isWallMounted(carried.type))
              }
            />
            <CarryController carryId={readOnly ? null : dragId} grab={grab} />

            <Lighting profile={profile} centre={officeArea.centre} reach={officeArea.reach} />

            {readOnly && layers.deskTags && <SeatTags />}
            {readOnly && <DeskPets />}
            {readOnly && <SeatPopup />}
            {readOnly && <StudioEnvironment intensity={profile.envIntensity} />}

            <Ground
              onDown={handleDown}
              onMove={handleMove}
              onUp={handleUp}
              onLeave={() => {
                setHover(null)
                wallResize.current?.hover(Infinity, Infinity)
              }}
              // View mode: a click on bare floor closes the desk card (a drag that
              // pans the camera doesn't). Desk clicks stop propagation first.
              onClick={
                readOnly
                  ? (delta) => {
                      if (delta <= 4) storeApi.getState().closeSeatCard()
                    }
                  : undefined
              }
              showGrid={!readOnly && layers.grid}
            />

            {/* The land round the office: its plateau and contour lines. */}
            <Contours isEditing={!readOnly} />
            {readOnly && <RouteLine />}
            {readOnly && <HeatPads />}
            {readOnly && <HeatBars />}

            {/* Tint the floor enclosed by walls (the office interior). */}
            <InteriorFloor />
            {/* Team zones: their floor tinted, their names. */}
            {layers.zones && <ZoneFloor isEditing={!readOnly} isDark={dark} />}
            {/* Editing: each room's area and desks. */}
            {!readOnly && layers.roomSizes && <RoomLabels />}
            {/* A saved room about to be placed: its walls merged, as they'll stand. */}
            {!readOnly && kitPlan && (
              <GhostWalls
                edges={kitPlan.flatMap((o) =>
                  o.type === "wall" || o.type === "glassWall"
                    ? [{ ...o, type: o.type, tint: doesKitFit ? undefined : "#ef4444" }]
                    : []
                )}
              />
            )}
            {!readOnly &&
              kitPlan
                ?.filter((o) => o.type !== "wall" && o.type !== "glassWall")
                .map((o, i) => (
                  <GhostObject
                    key={i}
                    type={o.type}
                    x={o.x}
                    z={o.z}
                    rotation={o.rotation}
                    color={o.color}
                    tint={doesKitFit ? undefined : "#ef4444"}
                  />
                ))}
            {/* Soft shadows grounding each piece on the floor. */}
            <ContactBlobs />
            {/* Sunlight through the windows, and glows on screens and lamps. */}
            <WindowLight profile={profile} />
            <Halos occupied={occupied} />

            {/* Walls render as merged runs (seamless); everything else individually. */}
            <Walls />
            <StaticBatch enabled={readOnly}>
              {objects
                .filter((obj) => !isWall(obj.type) && !isMarker(obj.type))
                .map((obj) => (
                  <ObjectRenderer
                    key={obj.id}
                    obj={obj}
                    selected={!readOnly && selection.includes(obj.id)}
                    carried={!readOnly && obj.id === dragId}
                    blockedAt={
                      obj.id === dragId
                        ? blockedAt
                        : obj.id === refusedTurn?.id
                          ? refusedTurn.at
                          : 0
                    }
                    tool={tool}
                    interactive={!readOnly}
                    onSelect={select}
                    onDelete={removeObject}
                    onStartDrag={onStartDrag}
                    onPickOpening={onPickOpening}
                    onToggleSelect={toggleSelect}
                    onMenuPress={readOnly ? undefined : onMenuPress}
                    onSeatClick={readOnly ? openSeatCard : undefined}
                    occupied={isSeatable(obj.type) ? occupied?.get(obj.id) : undefined}
                    wallFront={wallColors.openings.get(obj.id)?.[0]}
                    wallBack={wallColors.openings.get(obj.id)?.[1]}
                  />
                ))}
            </StaticBatch>

            {/* Corner posts finishing wall joints */}
            <Posts />

            {!readOnly && (
              <>
                {/* Wall draw + erase previews and interaction */}
                <BuildController />
                <BoxSelect />
                {tool === "paint" && <PaintController />}
                <NudgeKeys />

                {/* A door/window being moved along the walls */}
                {carriedOpening && (
                  <OpeningCarry
                    carried={carriedOpening}
                    onDone={() => {
                      setCarriedOpening(null)
                      storeApi.getState().endBatch()
                    }}
                  />
                )}

                {/* Row / Pod: every copy the drag would lay — red where blocked. */}
                {repeat &&
                  repeatPlan.map((p, i) => (
                    <GhostObject
                      key={i}
                      type={tool as ObjectType}
                      x={p.x}
                      z={p.z}
                      rotation={p.rotation}
                      tint={repeatBlocked[i] ? "#ef4444" : undefined}
                      color={placementColor ?? undefined}
                    />
                  ))}

                {/* Furniture build preview — red when it would overlap something */}
                {isFurniture &&
                  hover &&
                  !dragId &&
                  !repeat &&
                  (() => {
                    const rot = hover.rotation ?? placementRotation
                    const blocked = furnitureCollides(
                      objects,
                      tool as ObjectType,
                      hover.x,
                      hover.z,
                      rot
                    )
                    return (
                      <>
                        <PlacementHighlight
                          type={tool as ObjectType}
                          x={hover.x}
                          z={hover.z}
                          rotation={rot}
                          valid={!blocked}
                        />
                        <AlignmentGuides
                          objects={objects}
                          type={tool as ObjectType}
                          x={hover.x}
                          z={hover.z}
                          rotation={rot}
                        />
                        {measureHints && (
                          <MeasureHints
                            objects={objects}
                            type={tool as ObjectType}
                            x={hover.x}
                            z={hover.z}
                            rotation={rot}
                          />
                        )}
                        <GhostObject
                          type={tool as ObjectType}
                          x={hover.x}
                          z={hover.z}
                          rotation={rot}
                          tint={blocked ? "#ef4444" : undefined}
                          color={placementColor ?? undefined}
                        />
                      </>
                    )
                  })()}

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
                {/* Turned in place into others: red until it's turned free (or
                    let go, when it springs back). */}
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
            )}

            {/* Post-processing only in display mode. In edit mode we keep the plain
          R3F render so previews update live (the EffectComposer takes over the
          render loop, and reconfiguring it on mode-toggle can stall it). */}
            {readOnly && <PostFx highQuality />}
          </ShaderWarmup>
        </DaylightContext.Provider>
      </CursorHintContext.Provider>
    </SceneThemeContext.Provider>
  )
}
