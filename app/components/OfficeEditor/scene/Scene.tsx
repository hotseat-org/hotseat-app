import { OrbitControls, OrthographicCamera } from "@react-three/drei"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useThree } from "@react-three/fiber"
import { MOUSE } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { clampToFloor, furnitureCollides, mountWalls, snapToFootprint, wallMount } from "../layout"
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
import { CURSORS, getToolCursor } from "../cursors"
import { PlacementHighlight } from "./PlacementHighlight"
import { markShadowsDirty } from "./shadows"
import { Lighting } from "./Lighting"
import { StudioEnvironment } from "./StudioEnvironment"
import { PostFx } from "./PostFx"
import { Ground } from "./Ground"
import { InteriorFloor } from "./InteriorFloor"
import { GhostObject } from "./GhostObject"
import { Posts } from "./Posts"
import { Walls } from "./Walls"
import { BuildController } from "./BuildController"
import { CarryController } from "./CarryController"
import { CameraControls, type FloorPan } from "./CameraControls"
import { WallXray } from "./WallXray"
import { CameraFit } from "./CameraFit"
import { SeatTags } from "./SeatTags"
import { SeatPopup } from "./SeatPopup"
import { BoxSelect } from "./BoxSelect"
import { PaintController } from "./PaintController"
import { NudgeKeys } from "./NudgeKeys"
import { OpeningCarry } from "./OpeningCarry"
import { NO_XRAY, XrayContext } from "./xray"
import { DeskPets } from "./DeskPets"
import { MeasureHints } from "./MeasureHints"
import { aimAtWallHeight } from "./wallAim"

const NO_ACTIVE = new Set<string>()

interface Props {
  /** Display mode: render the office but disable all editing interaction. */
  readOnly?: boolean
  /** App theme is dark → deep slate surfaces (lighting stays bright). */
  dark?: boolean
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

export const Scene = ({ readOnly = false, dark = false }: Props) => {
  const objects = useEditorStore((s) => s.objects)
  const selection = useEditorStore((s) => s.selection)
  const tool = useEditorStore((s) => s.tool)
  const placementRotation = useEditorStore((s) => s.placementRotation)
  const placementColors = useEditorStore((s) => s.placementColors)
  const measureHints = useEditorStore((s) => s.measureHints)
  const placementColor = isObjectType(tool) ? placementColors[tool] : undefined
  const timeOfDay = useEditorStore((s) => s.timeOfDay)
  const surfaces = dark ? SURFACES.dark : SURFACES.light
  const profile = daylight(timeOfDay, surfaces.nightDepth)
  const addObject = useEditorStore((s) => s.addObject)
  const removeObject = useEditorStore((s) => s.removeObject)
  const select = useEditorStore((s) => s.select)
  const toggleSelect = useEditorStore((s) => s.toggleSelect)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)

  // Cached shadows (see shadows.ts): redraw the shadow maps only when the scene
  // changes — any store update (objects, time of day), theme or mode switch.
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
    return storeApi.subscribe(() => markShadowsDirty(gl, invalidate))
  }, [gl, invalidate, storeApi])
  useLayoutEffect(() => markShadowsDirty(gl, invalidate), [gl, invalidate, dark, readOnly])

  // Where the armed piece would go (wall items also carry the way they face).
  const [hover, setHover] = useState<(Cell & { rotation?: number }) | null>(null)
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
  // Wall/door segments under the cursor, shown see-through (edit mode only).
  const [xrayActive, setXrayActive] = useState<Set<string>>(NO_ACTIVE)
  const fades = useRef(new Map<string, number>())
  const xray = useMemo(
    () =>
      xrayActive.size
        ? { active: xrayActive, fade: (id: string) => fades.current.get(id) ?? 0 }
        : NO_XRAY,
    [xrayActive]
  )

  const isFurniture = FURNITURE.has(tool)

  // Leaving edit mode drops whatever was being carried (it'd keep following
  // the cursor in the read-only view otherwise).
  useEffect(() => {
    if (readOnly) {
      setDragId(null)
      storeApi.getState().endBatch()
    }
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
    return clampToFloor(type, placementRotation, snapToFootprint(type, placementRotation, x, z))
  }

  // View mode: who's in at each desk on the shown day (clutter, monitor, pet).
  const { desks } = useDesksOnDay()
  const occupied = useMemo(
    () => (readOnly ? new Map(desks.map((d) => [d.desk.id, d.state.kind !== "free"])) : null),
    [readOnly, desks]
  )
  // Wall items are cut away with the wall segments they hang on. Unchanged
  // lists keep their identity, so those pieces don't re-render (they're memoized).
  const mountsCache = useRef(new Map<string, string[]>())
  const mounts = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const o of objects) {
      if (!isWallMounted(o.type)) continue
      const ids = mountWalls(objects, o.type, o.x, o.z, o.rotation) ?? []
      const prev = mountsCache.current.get(o.id)
      map.set(o.id, prev && prev.join() === ids.join() ? prev : ids)
    }
    mountsCache.current = map
    return map
  }, [objects])

  // Drop the carried object — but only onto a free footprint.
  // Last refused drop (a timestamp) — the carried object shakes "no".
  const [blockedAt, setBlockedAt] = useState(0)
  // Tell the store what's being carried (R then rotates it freely).
  useEffect(() => {
    storeApi.getState().setCarrying(dragId)
  }, [dragId, storeApi])

  const tryDrop = () => {
    const o = objects.find((obj) => obj.id === dragId)
    if (o && furnitureCollides(objects, o.type, o.x, o.z, o.rotation, o.id)) {
      setBlockedAt(performance.now())
      return
    }
    setDragId(null)
    storeApi.getState().endBatch() // the whole carry = one undo step
  }

  // Click-to-move: click an object to pick it up (it follows the cursor), click
  // again to drop it. `dragId` is the object currently being carried.
  const handlePick = (id: string) => {
    if (dragId) tryDrop()
    else {
      storeApi.getState().beginBatch()
      setDragId(id)
    }
  }

  // Stable handles for the (memoized) pieces — the real handlers change with
  // every render (they close over what's being carried).
  const handlers = useRef({ handlePick, pickOpening })
  handlers.current = { handlePick, pickOpening }
  const onStartDrag = useCallback((id: string) => handlers.current.handlePick(id), [])
  const onPickOpening = useCallback((id: string) => handlers.current.pickOpening(id), [])

  const floorPan = useRef<FloorPan | null>(null)
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
  const handleDown = (_x: number, _z: number, button: number, e: PointerEvent) => {
    if (readOnly || button !== 0) return
    if (dragId) {
      tryDrop() // clicking anywhere drops what you're carrying (if the spot is free)
      return
    }
    if (carriedOpening) return
    // Bare floor, Select tool + Shift: a box selection, added to the current
    // one — BoxSelect takes over the drag.
    if (tool === "select" && e.shiftKey) {
      storeApi
        .getState()
        .setBox({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, additive: true })
      return
    }
    // Otherwise a drag pans (Select, furniture); a click acts on pointerup.
    isFloorPress.current = true
    if (tool === "select" || isFurniture) floorPan.current?.start(e)
  }

  const handleMove = (x: number, z: number) => {
    if (readOnly || dragId) return // carrying is handled by CarryController (plane raycast)
    if (isFurniture) setHover(placeAt(tool as ObjectType, x, z))
    else setHover({ x, z })
  }

  const handleUp = (x: number, z: number, button: number) => {
    if (readOnly || button !== 0 || dragId) return
    if (floorPan.current?.hasMoved()) return // that was a pan, not a click
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
  // Canvas cursor between camera gestures: the tool's, a closed hand while
  // carrying a piece, the plain arrow in display mode.
  const cursor = readOnly
    ? CURSORS.select
    : carried || carriedOpening
      ? "grabbing"
      : getToolCursor(tool, isFurniture)

  return (
    <SceneThemeContext.Provider value={surfaces}>
      <XrayContext.Provider value={xray}>
        <DaylightContext.Provider value={profile.nightness}>
          <OrthographicCamera makeDefault position={[22, 20, 22]} zoom={46} near={0.1} far={200} />
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
          <CameraControls floorPan={floorPan} cursor={cursor} readOnly={readOnly} />
          <CameraFit />

          {/* See-through, cut-down wall section under the cursor — always in view
            mode; in edit mode while selecting or placing furniture (the wall,
            door and erase tools target walls directly). */}
          <WallXray
            // Off while hanging or carrying a wall item — you're pointing at
            // the very wall it goes on.
            enabled={
              (readOnly || tool === "select" || isFurniture) &&
              !carriedOpening &&
              !isWallMounted(tool as ObjectType) &&
              !(carried && isWallMounted(carried.type))
            }
            fades={fades.current}
            onChange={setXrayActive}
          />
          <CarryController carryId={readOnly ? null : dragId} />

          <Lighting profile={profile} />

          {readOnly && <SeatTags />}
          {readOnly && <DeskPets />}
          {readOnly && <SeatPopup />}
          {readOnly && <StudioEnvironment intensity={profile.envIntensity} />}

          <Ground
            onDown={handleDown}
            onMove={handleMove}
            onUp={handleUp}
            onLeave={() => setHover(null)}
            // View mode: a click on bare floor closes the desk card (a drag that
            // pans the camera doesn't). Desk clicks stop propagation first.
            onClick={
              readOnly
                ? (delta) => {
                    if (delta <= 4) storeApi.getState().closeSeatCard()
                  }
                : undefined
            }
            showGrid={!readOnly}
          />

          {/* Tint the floor enclosed by walls (the office interior). */}
          <InteriorFloor />

          {/* Walls render as merged runs (seamless); everything else individually. */}
          <Walls />
          {objects
            .filter((obj) => !isWall(obj.type) && !isMarker(obj.type))
            .map((obj) => (
              <ObjectRenderer
                key={obj.id}
                obj={obj}
                selected={!readOnly && selection.includes(obj.id)}
                carried={!readOnly && obj.id === dragId}
                blockedAt={obj.id === dragId ? blockedAt : 0}
                tool={tool}
                interactive={!readOnly}
                onSelect={select}
                onDelete={removeObject}
                onStartDrag={onStartDrag}
                onPickOpening={onPickOpening}
                onToggleSelect={toggleSelect}
                onSeatClick={readOnly ? openSeatCard : undefined}
                occupied={isSeatable(obj.type) ? occupied?.get(obj.id) : undefined}
                mountedOn={mounts.get(obj.id)}
              />
            ))}

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

              {/* Furniture build preview — red when it would overlap something */}
              {isFurniture &&
                hover &&
                !dragId &&
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
        </DaylightContext.Provider>
      </XrayContext.Provider>
    </SceneThemeContext.Provider>
  )
}
