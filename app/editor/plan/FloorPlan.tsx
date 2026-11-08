import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PlanState } from "../module"
import { useModules, usePlanDrawings, usePlanPieceStyles, useViewClicks } from "../modules"
import { useEditorStore, useEditorStoreApi } from "../store"
import { useShownFloorLinks } from "../useShownFloorLinks"
import { useFloorLinkClick } from "../useFloorLinkClick"
import { isFloorLink } from "../floorLinks"
import { LiftButtons } from "../ui/LiftButtons"
import { useLiftPanel } from "../ui/useLiftButtons"
import { SURFACES } from "../palette"
import { ContourLines } from "../landscape/ContourLines"
import { FLOOR_CHIP_HEIGHT, FloorChip } from "../ui/menus/FloorChip"
import { isEdgeType, type SceneObject } from "../types"
import { getIsZoomedIn } from "../camera/zoomedIn"
import { PhoneControls } from "./PhoneControls"
import { buildScene } from "./drawing/buildScene"
import { fitView, turnObject, type Bounds, type Insets, type View } from "./planView"
import { useGlide, type Frame } from "./useFraming"
import { usePlanGestures } from "./usePlanGestures"
import { PlanLight } from "./PlanLight"

/** Room kept clear of the floating chrome when fitting (px). */
const FIT_PAD = { top: 96, bottom: 112, left: 112 }

/** How faded the floor below shows under an upper floor's plan. */
const BELOW_OPACITY = 0.35

/** The box round both drawings (either may be empty). */
const mergeBounds = (first: Bounds | null, second: Bounds | null): Bounds | null =>
  first && second
    ? {
        minX: Math.min(first.minX, second.minX),
        maxX: Math.max(first.maxX, second.maxX),
        minY: Math.min(first.minY, second.minY),
        maxY: Math.max(first.maxY, second.maxY),
      }
    : (first ?? second)

/**
 * Simple mode: the office as a top-down plan (SVG) — for phones, devices that
 * struggle with the 3D scene, or no WebGL at all. Walls, doors and furniture
 * seen from above, and whatever the modules add (the office: desks by who's
 * in on the shown day, their card on tap). Drag to pan; wheel, two-finger
 * scroll or pinch to zoom; Q / E to turn; Fit (bottom bar) re-frames it.
 *
 * On a phone (`phoneChrome`: what the phone shell covers at the top and
 * bottom) the office fits between that chrome, and the turn / fit buttons sit
 * just above the bottom of it.
 */
export const FloorPlan = ({
  dark,
  padLeft = FIT_PAD.left,
  padRight = 40,
  phoneChrome,
}: {
  dark: boolean
  /** Screen space a column of text on the left covers, kept clear when fitting (px). */
  padLeft?: number
  /** Screen space the right-hand panels cover, kept clear when fitting (px). */
  padRight?: number
  phoneChrome?: { top: number; bottom: number }
}) => {
  const layout = useEditorStore((state) => state.objects)
  const fitNonce = useEditorStore((state) => state.fitNonce)
  const requestFit = useEditorStore((state) => state.requestFit)
  const idPrefix = useId().replace(/:/g, "")
  const surfaces = dark ? SURFACES.dark : SURFACES.light
  const modules = useModules()
  const viewClicks = useViewClicks()

  // View angle: the whole layout turned by quarter turns (see turnObject).
  const turn = useEditorStore((state) => state.planTurn)
  const turnBy = useEditorStore((state) => state.turnPlan)
  // With what other floors bring here: lifts passing through, stairs coming up.
  const links = useShownFloorLinks()
  const objects = useMemo(
    () =>
      [...layout, ...links.passingLifts, ...links.arrivingStairs].map((object) =>
        turnObject(object, turn)
      ),
    [layout, links, turn]
  )
  // The ground floor's pieces (the land is shaped round them, from every
  // floor) and the walls of the floor right below (drawn faded under this one).
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)
  const { groundPieces, belowWalls } = useMemo(() => {
    const level = floors.findIndex((floor) => floor.id === currentFloor)
    const onFloor = (index: number) =>
      otherFloorsPieces.filter((piece) => piece.floor === floors[index]?.id)

    return {
      groundPieces: level === 0 ? layout : onFloor(0),
      belowWalls: level > 0 ? onFloor(level - 1).filter((piece) => isEdgeType(piece.type)) : [],
    }
  }, [floors, currentFloor, otherFloorsPieces, layout])

  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [view, setView] = useState<View | null>(null)
  const { moved } = usePlanGestures(box, setView, turnBy)

  // A piece clicked in the drawing, not the end of a pan.
  // Stairs and lifts change floor (see useFloorLinkClick); the rest are the modules'.
  const handleLinkClick = useFloorLinkClick()
  const onPiece = useCallback(
    (id: string) => {
      if (moved.current) return

      const link = [...links.arrivingStairs, ...links.passingLifts, ...layout].find(
        (piece) => piece.id === id && isFloorLink(piece)
      )
      if (link) handleLinkClick(link)
      else viewClicks.onPiece(id)
    },
    [moved, viewClicks, links, layout, handleLinkClick]
  )
  const isClickable = useCallback(
    (object: SceneObject) => isFloorLink(object) || viewClicks.isClickable(object),
    [viewClicks]
  )
  const liftPanel = useLiftPanel()
  const setHoveredPiece = useEditorStore((state) => state.setHoveredPiece)
  const styleOf = usePlanPieceStyles(objects)
  const drawings = usePlanDrawings({ objects, isDark: dark, idPrefix, onPiece })

  // The whole drawing (memoized: panning only changes the transform).
  const scene = useMemo(
    () =>
      buildScene({
        objects,
        wall: surfaces.wall,
        floorInside: surfaces.floorInside,
        styleOf,
        isClickable,
        onPiece,
        onHover: setHoveredPiece,
        drawings,
      }),
    [
      objects,
      surfaces.wall,
      surfaces.floorInside,
      styleOf,
      isClickable,
      onPiece,
      setHoveredPiece,
      drawings,
    ]
  )

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return

    const resizeObserver = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    )
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [])

  // Frame the office on open, on Fit, and when the layout first gets content —
  // but not on every layout or size change (that would undo the viewer's pan).
  const hasFloors = useEditorStore((state) => state.floors.length > 1)
  const insets: Insets = phoneChrome
    ? {
        // Clear of the floor chip, when there's one.
        top: phoneChrome.top + 12 + (hasFloors ? FLOOR_CHIP_HEIGHT + 8 : 0),
        bottom: phoneChrome.bottom + 68,
        left: 16,
        right: 16,
      }
    : { ...FIT_PAD, left: padLeft, right: padRight }
  // The floor right below, faded: where this one stands — an empty upper floor
  // isn't a blank map — and with it the building framed whole, the same
  // from every floor.
  const belowScene = useMemo(
    () =>
      belowWalls.length > 0
        ? buildScene({
            objects: belowWalls.map((piece) => turnObject(piece, turn)),
            wall: surfaces.wall,
            floorInside: surfaces.ceiling,
            styleOf: () => undefined,
            isClickable: () => false,
            onPiece: () => {},
            drawings: [],
          })
        : null,
    [belowWalls, turn, surfaces.wall, surfaces.ceiling]
  )
  const bounds = mergeBounds(scene.bounds, belowScene?.bounds ?? null)
  const frame = useRef<Frame>({ size, bounds, insets })
  frame.current = { size, bounds, insets }
  const hasContent = !!bounds
  const measured = size !== null

  // The whole office's fit zoom: closer than it is "zoomed in" (as in 3D).
  const fitZoom = useRef(0)
  useLayoutEffect(() => {
    const { size: frameSize, bounds, insets: padding } = frame.current
    if (!frameSize || !bounds) return

    const fitted = fitView(bounds, frameSize, padding)
    fitZoom.current = fitted.zoom
    setView(fitted)
  }, [fitNonce, hasContent, measured, turn])

  // Zoomed in or not, for the app (the headline folds), as the 3D camera tells it.
  const store = useEditorStoreApi()
  const zoom = view?.zoom
  useEffect(() => {
    if (!zoom || !fitZoom.current) return

    const { isZoomedIn, setZoomedIn } = store.getState()
    const isNowZoomedIn = getIsZoomedIn(zoom / fitZoom.current, isZoomedIn)
    if (isNowZoomedIn !== isZoomedIn) setZoomedIn(isNowZoomedIn)
  }, [zoom, store])
  // Leaving the plan (to 3D, which tells it afresh): not zoomed in.
  useEffect(() => () => store.getState().setZoomedIn(false), [store])

  const viewRef = useRef(view)
  viewRef.current = view
  const glideTo = useGlide(setView)

  // What the modules' layers and overlays are given.
  const plan: PlanState | null = view && {
    view,
    turn,
    objects,
    isDark: dark,
    screen: (x, z) => ({ left: x * view.zoom + view.offsetX, top: z * view.zoom + view.offsetY }),
    isMoved: () => moved.current,
    glideTo,
    viewRef,
    frame,
    phoneChrome,
  }
  const svgLayers = modules.flatMap((module) => module.plan?.svgLayers ?? [])
  const overlays = modules.flatMap((module) => module.plan?.overlays ?? [])

  return (
    <div
      ref={box}
      className="absolute inset-0 touch-none select-none overflow-hidden"
      style={{ background: surfaces.planBackdrop }}
      // A click anywhere but a piece (they stop it) or a card is the modules'
      // floor click (it closes the desk card); the end of a pan isn't.
      onClick={() => {
        if (!moved.current) viewClicks.onFloor()
      }}
    >
      <svg className="absolute inset-0 size-full" aria-label="Office" role="img">
        {plan && (
          <g
            transform={`translate(${plan.view.offsetX} ${plan.view.offsetY}) scale(${plan.view.zoom})`}
          >
            {size && (
              <ContourLines
                layout={groundPieces}
                turn={turn}
                view={plan.view}
                size={size}
                colors={surfaces.contour}
              />
            )}
            {belowScene && <g opacity={BELOW_OPACITY}>{belowScene.node}</g>}
            {scene.node}
            {svgLayers.map((Layer, index) => (
              <Layer key={index} plan={plan} />
            ))}
          </g>
        )}
      </svg>
      <PlanLight isDark={dark} />

      {plan && overlays.map((Overlay, index) => <Overlay key={index} plan={plan} />)}

      {/* A pressed lift's floor buttons, beside it. */}
      {plan && liftPanel && (
        <div
          className="absolute -translate-y-1/2"
          style={(() => {
            const turned = turnObject(liftPanel.lift, turn)
            const { left, top } = plan.screen(turned.x, turned.z)

            return { left: left + 28, top }
          })()}
        >
          <LiftButtons {...liftPanel} />
        </div>
      )}

      {phoneChrome && (
        <>
          <FloorChip top={phoneChrome.top + 12} />
          <PhoneControls bottom={phoneChrome.bottom + 12} onTurn={turnBy} onFit={requestFit} />
        </>
      )}
    </div>
  )
}
