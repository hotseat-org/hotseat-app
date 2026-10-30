import { OrbitControls, OrthographicCamera } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useThree } from "@react-three/fiber"
import { MOUSE } from "three"
import { useEditorStore, useEditorStoreApi, useObjectsWithPaintPreview } from "../store"
import { composeWallColors, snapPlacement, wallMount } from "../layout"
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
} from "../types"
import { ObjectRenderer } from "../objects/ObjectRenderer"
import { StaticBatch } from "../objects/StaticBatch"
import { CURSORS, CursorHintContext, getToolCursor, type CursorHint } from "../cursors"
import { canPlaceKit, composeKitAt } from "../kits"
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
import { aimAtWallHeight } from "./wallAim"
import { KitGhost } from "./KitGhost"
import { PlacementPreviews } from "./PlacementPreviews"
import { useCachedShadows } from "./useCachedShadows"
import { useContextMenuPress } from "./useContextMenuPress"
import { useFurnitureDrag } from "./useFurnitureDrag"
import { useOfficeArea } from "./useOfficeArea"
import { useOpeningCarry } from "./useOpeningCarry"
import { useRepeatPlacement } from "./useRepeatPlacement"

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

export const Scene = ({ readOnly = false, dark = false, fitInsets }: Props) => {
  const objects = useEditorStore((s) => s.objects)
  // Doors and windows wear their wall line's paint (or the Paint tool's, hovered).
  const paintedObjects = useObjectsWithPaintPreview()
  const wallColors = useMemo(() => composeWallColors(paintedObjects), [paintedObjects])
  const selection = useEditorStore((s) => s.selection)
  const tool = useEditorStore((s) => s.tool)
  const placementRotation = useEditorStore((s) => s.placementRotation)
  const placementColors = useEditorStore((s) => s.placementColors)
  const layers = useEditorStore((s) => s.layers)
  const placementColor = isObjectType(tool) ? placementColors[tool] : undefined
  const timeOfDay = useEditorStore((s) => s.timeOfDay)
  const surfaces = dark ? SURFACES.dark : SURFACES.light
  const profile = daylight(timeOfDay, surfaces.nightDepth)
  const officeArea = useOfficeArea(objects)
  const addObject = useEditorStore((s) => s.addObject)
  const removeObject = useEditorStore((s) => s.removeObject)
  const select = useEditorStore((s) => s.select)
  const toggleSelect = useEditorStore((s) => s.toggleSelect)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)
  const refusedTurn = useEditorStore((s) => s.refusedTurn)

  const raycaster = useThree((s) => s.raycaster)
  const pointer = useThree((s) => s.pointer)
  const camera = useThree((s) => s.camera)
  const storeApi = useEditorStoreApi()
  // The desk card lives in the scene (follows its desk); just close it when
  // switching modes.
  useEffect(() => {
    storeApi.getState().closeSeatCard()
  }, [readOnly, storeApi])
  useCachedShadows(readOnly, dark)

  // Where the armed piece would go (wall items also carry the way they face).
  const [hover, setHover] = useState<(Cell & { rotation?: number }) | null>(null)
  // A saved room on the cursor: where it'd land, and whether it fits there.
  const armedKit = useEditorStore((s) => s.armedKit)
  const kitPlan = useMemo(
    () => (armedKit && hover ? composeKitAt(armedKit, hover.x, hover.z) : null),
    [armedKit, hover]
  )
  const doesKitFit = useMemo(() => !!kitPlan && canPlaceKit(objects, kitPlan), [kitPlan, objects])
  const isFurniture = FURNITURE.has(tool)
  const { repeat, setRepeat, isRepeating, repeatPlan, repeatBlocked } = useRepeatPlacement(
    tool,
    isFurniture
  )
  const { dragId, grab, blockedAt, onStartDrag } = useFurnitureDrag(readOnly)
  const { carriedOpening, onPickOpening, finishOpening } = useOpeningCarry(readOnly, tool, dragId)
  const { pressMenu, onMenuPress } = useContextMenuPress(readOnly)

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
            {/* A saved room about to be placed. */}
            {!readOnly && kitPlan && <KitGhost plan={kitPlan} doesFit={doesKitFit} />}
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
                {carriedOpening && <OpeningCarry carried={carriedOpening} onDone={finishOpening} />}

                <PlacementPreviews
                  isFurniture={isFurniture}
                  hover={hover}
                  isRepeatDragging={!!repeat}
                  repeatPlan={repeatPlan}
                  repeatBlocked={repeatBlocked}
                  dragId={dragId}
                  carried={carried}
                />
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
