import { OrbitControls, OrthographicCamera } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useThree } from "@react-three/fiber"
import { MOUSE } from "three"
import { useEditorStore, useEditorStoreApi, useObjectsWithPaintPreview } from "../store"
import { composeWallColors, snapPlacement, wallMount } from "../layout"
import { daylight, DaylightContext } from "../daylight"
import { SURFACES } from "../palette"
import { SceneThemeContext } from "../sceneTheme"
import { isMarker, isObjectType, isWallMounted, type Cell, type ObjectType } from "../types"
import { ObjectRenderer } from "../objects/ObjectRenderer"
import { StaticBatch } from "../objects/StaticBatch"
import { CURSORS, CursorHintContext, getToolCursor, type CursorHint } from "../cursors"
import { canPlaceKit, composeKitAt } from "../kits"
import { getRenderer } from "../catalog/rendering"
import { useModules, usePieceStates, useViewClicks } from "../editor/modules"
import { Lighting } from "./Lighting"
import { StudioEnvironment } from "./StudioEnvironment"
import { PostFx } from "./PostFx"
import { ShaderWarmup } from "./ShaderWarmup"
import { Ground } from "./Ground"
import { Contours } from "./Contours"
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
import { CameraFit, type FitInsets } from "./CameraFit"
import { BoxSelect } from "./BoxSelect"
import { PaintController } from "./PaintController"
import { NudgeKeys } from "./NudgeKeys"
import { OpeningCarry } from "./OpeningCarry"
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
  const objects = useEditorStore((state) => state.objects)
  // Doors and windows wear their wall line's paint (or the Paint tool's, hovered).
  const paintedObjects = useObjectsWithPaintPreview()
  const wallColors = useMemo(() => composeWallColors(paintedObjects), [paintedObjects])
  const selection = useEditorStore((state) => state.selection)
  const tool = useEditorStore((state) => state.tool)
  const placementRotation = useEditorStore((state) => state.placementRotation)
  const placementColors = useEditorStore((state) => state.placementColors)
  const layers = useEditorStore((state) => state.layers)
  const placementColor = isObjectType(tool) ? placementColors[tool] : undefined
  const timeOfDay = useEditorStore((state) => state.timeOfDay)
  const surfaces = dark ? SURFACES.dark : SURFACES.light
  const profile = daylight(timeOfDay, surfaces.nightDepth)
  const officeArea = useOfficeArea(objects)
  const addObject = useEditorStore((state) => state.addObject)
  const removeObject = useEditorStore((state) => state.removeObject)
  const select = useEditorStore((state) => state.select)
  const toggleSelect = useEditorStore((state) => state.toggleSelect)
  const refusedTurn = useEditorStore((state) => state.refusedTurn)

  const raycaster = useThree((state) => state.raycaster)
  const pointer = useThree((state) => state.pointer)
  const camera = useThree((state) => state.camera)
  const storeApi = useEditorStoreApi()
  useCachedShadows(readOnly, dark)

  // Where the armed piece would go (wall items also carry the way they face).
  const [hover, setHover] = useState<(Cell & { rotation?: number }) | null>(null)
  // A saved room on the cursor: where it'd land, and whether it fits there.
  const armedKit = useEditorStore((state) => state.armedKit)
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
      const mount = wallMount(objects, type, aim.x, aim.z)
      if (mount) return mount
    }
    return snapPlacement(objects, type, placementRotation, x, z)
  }

  // The modules': how they see each piece (a lived-in desk), what clicks do
  // while viewing, and what they draw in the scene.
  const pieceStates = usePieceStates(readOnly)
  const viewClicks = useViewClicks()
  const modules = useModules()
  const sceneLayers = modules
    .flatMap((module) => module.sceneLayers ?? [])
    .filter((layer) => layer.when === "always" || (layer.when === "viewing") === readOnly)

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
  const handleDown = (x: number, z: number, button: number, event: PointerEvent) => {
    if (!readOnly && button === 2) return pressMenu(null, { x, z }, event)
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
    if (tool === "select" && event.shiftKey) {
      storeApi.getState().setBox({
        x0: event.clientX,
        y0: event.clientY,
        x1: event.clientX,
        y1: event.clientY,
        additive: true,
      })
      return
    }
    // A saved room on the cursor: a click places it, a drag pans.
    if (armedKit) {
      isFloorPress.current = true
      floorPan.current?.start(event)
      return
    }
    // Select, at a wall's foot: drag the wall sideways.
    if (tool === "select" && wallResize.current?.press(x, z)) return
    // Otherwise a drag pans (Select, furniture); a click acts on pointerup.
    isFloorPress.current = true
    if (tool === "select" || isFurniture) floorPan.current?.start(event)
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
        repeatPlan.map((placement) => ({
          type: tool as ObjectType,
          ...placement,
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
      const placement = placeAt(tool as ObjectType, x, z)
      addObject({
        type: tool as ObjectType,
        x: placement.x,
        z: placement.z,
        rotation: placement.rotation ?? placementRotation,
        color: placementColor ?? undefined,
      })
    }
  }

  const carried = dragId ? objects.find((object) => object.id === dragId) : undefined
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

            {readOnly && <StudioEnvironment intensity={profile.envIntensity} />}

            <Ground
              onDown={handleDown}
              onMove={handleMove}
              onUp={handleUp}
              onLeave={() => {
                setHover(null)
                wallResize.current?.hover(Infinity, Infinity)
              }}
              // View mode: a click on bare floor (not a drag that pans the
              // camera) is the modules' — it closes the desk card. Piece
              // clicks stop propagation first.
              onClick={
                readOnly
                  ? (delta) => {
                      if (delta <= 4) viewClicks.onFloor()
                    }
                  : undefined
              }
              showGrid={!readOnly && layers.grid}
            />

            {/* The land round the office: its plateau and contour lines. */}
            <Contours isEditing={!readOnly} />

            {/* Tint the floor enclosed by walls (the office interior). */}
            <InteriorFloor />
            {/* The modules' layers (the office: zones, desk tags, the heatmap, the way to a desk). */}
            {sceneLayers.map(({ Component }, index) => (
              <Component key={index} isEditing={!readOnly} isDark={dark} />
            ))}
            {/* Editing: each room's area and desks. */}
            {!readOnly && layers.roomSizes && <RoomLabels />}
            {/* A saved room about to be placed. */}
            {!readOnly && kitPlan && <KitGhost plan={kitPlan} doesFit={doesKitFit} />}
            {/* Soft shadows grounding each piece on the floor. */}
            <ContactBlobs />
            {/* Sunlight through the windows, and glows on screens and lamps. */}
            <WindowLight profile={profile} />
            <Halos pieceStates={pieceStates} />

            {/* Walls render as merged runs (seamless); everything else individually. */}
            <Walls />
            <StaticBatch enabled={readOnly}>
              {objects
                .filter(
                  (object) => !getRenderer(object.type).isDrawnAsRun && !isMarker(object.type)
                )
                .map((object) => (
                  <ObjectRenderer
                    key={object.id}
                    object={object}
                    selected={!readOnly && selection.includes(object.id)}
                    carried={!readOnly && object.id === dragId}
                    blockedAt={
                      object.id === dragId
                        ? blockedAt
                        : object.id === refusedTurn?.id
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
                    onViewClick={
                      readOnly && viewClicks.isClickable(object) ? viewClicks.onPiece : undefined
                    }
                    occupied={pieceStates?.get(object.id)?.isOccupied}
                    wallFront={wallColors.openings.get(object.id)?.[0]}
                    wallBack={wallColors.openings.get(object.id)?.[1]}
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
