import { OrbitControls, OrthographicCamera } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useThree } from "@react-three/fiber"
import { MOUSE } from "three"
import { useEditorStore, useEditorStoreApi, useObjectsWithPaintPreview } from "../store"
import { composeWallColors, snapPlacement, wallMount } from "../layout"
import { daylight, DaylightContext } from "../lighting/daylight"
import { SURFACES } from "../palette"
import {
  isEdgeType,
  isMarker,
  isObjectType,
  isWallMounted,
  type Cell,
  type ObjectType,
} from "../types"
import { ObjectRenderer } from "../objects/ObjectRenderer"
import { StaticBatch } from "../objects/StaticBatch"
import { CURSORS, CursorHintContext, getToolCursor, type CursorHint } from "../shell/cursors"
import { canPlaceKit, composeKitAt } from "../kits/kits"
import { getRenderer } from "../catalog/rendering"
import { useModules, usePieceStates, useViewClicks } from "../modules"
import { Lighting } from "../lighting/Lighting"
import { StudioEnvironment } from "../lighting/StudioEnvironment"
import { PostFx } from "../lighting/PostFx"
import { Ground } from "../landscape/Ground"
import { CAMERA_OFFSET } from "../camera/viewCentre"
import { WindowLight } from "../lighting/WindowLight"
import { Posts } from "../walls/Posts"
import { Walls } from "../walls/Walls"
import { BuildController } from "../building/BuildController"
import { CarryController } from "../carrying/CarryController"
import { CameraControls, type FloorPan } from "../camera/CameraControls"
import { WallXray } from "../walls/WallXray"
import { WallResize, type WallResizeHandle } from "../building/WallResize"
import { CameraFit, type FitInsets } from "../camera/CameraFit"
import { PaintController } from "../building/PaintController"
import { NudgeKeys } from "../carrying/NudgeKeys"
import { OpeningCarry } from "../carrying/OpeningCarry"
import { aimAtWallHeight } from "../building/wallAim"
import { KitGhost } from "../kits/KitGhost"
import { PlacementPreviews } from "../building/PlacementPreviews"
import { useCachedShadows } from "../lighting/useCachedShadows"
import { useFurnitureDrag } from "../carrying/useFurnitureDrag"
import { useOpeningCarry } from "../carrying/useOpeningCarry"
import { useRepeatPlacement } from "../building/useRepeatPlacement"
import { FloorShift, FloorsBelow } from "./FloorStack"
import { useOfficeArea } from "./useOfficeArea"
import { useContextMenuPress } from "./useContextMenuPress"
import { BoxSelect } from "./BoxSelect"
import { RoomLabels } from "./RoomLabels"
import { Halos } from "./Halos"
import { ContactBlobs } from "./ContactBlobs"
import { InteriorFloor } from "./InteriorFloor"
import { ShaderWarmup } from "./ShaderWarmup"
import { SceneThemeContext } from "./sceneTheme"

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
  // Higher up, the ground is drawn below (see FloorsBelow).
  const isGroundFloor = useEditorStore((state) => state.floors[0]?.id === state.currentFloor)

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
  // A tool that places a piece of furniture (not an edge, not a marker).
  const isFurniture = isObjectType(tool) && !isEdgeType(tool) && !isMarker(tool)
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
      const mount = wallMount(objects, type, aim)
      if (mount) return mount
    }

    return snapPlacement(objects, { type, rotation: placementRotation }, { x, z })
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
  const handleDown = ({ x, z }: Cell, button: number, event: PointerEvent) => {
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
        startX: event.clientX,
        startY: event.clientY,
        endX: event.clientX,
        endY: event.clientY,
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

  const getBlockedAt = (id: string) => {
    if (id === dragId) return blockedAt
    if (id === refusedTurn?.id) return refusedTurn.at

    return 0
  }
  const carried = dragId ? objects.find((object) => object.id === dragId) : undefined
  // Canvas cursor between camera gestures: the tool's, a closed hand while
  // carrying a piece, the plain arrow in display mode.
  const getCanvasCursor = () => {
    if (readOnly) return CURSORS.select
    if (carried || carriedOpening) return "grabbing"
    if (armedKit) return CURSORS.place

    return getToolCursor(tool, isFurniture)
  }
  const cursor = getCanvasCursor()

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

            {/* The floor shown, and what's below it — gliding together to another floor. */}
            <FloorShift>
              <Ground
                isGroundFloor={isGroundFloor}
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

              {/* The ground and its land, and the floors below with the ceiling built on. */}
              <FloorsBelow isEditing={!readOnly} />

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
                      blockedAt={getBlockedAt(object.id)}
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
                  {carriedOpening && (
                    <OpeningCarry carried={carriedOpening} onDone={finishOpening} />
                  )}

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
            </FloorShift>

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
