import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PlanState } from "../editor/module"
import { useModules, usePlanDrawings, usePlanPieceStyles, useViewClicks } from "../editor/modules"
import { useEditorStore } from "../store"
import { SURFACES } from "../palette"
import { PhoneControls } from "../office/plan/overlays"
import { ContourLines } from "./ContourLines"
import { buildScene } from "./drawing/buildScene"
import { fitView, turnObject, type Insets, type View } from "./planView"
import { useGlide, type Frame } from "./useFraming"
import { usePlanGestures } from "./usePlanGestures"

/** Room kept clear of the floating chrome when fitting (px). */
const FIT_PAD = { top: 96, bottom: 112, left: 112 }

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
  padRight = 40,
  phoneChrome,
}: {
  dark: boolean
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
  const objects = useMemo(() => layout.map((object) => turnObject(object, turn)), [layout, turn])

  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [view, setView] = useState<View | null>(null)
  const { moved, onPointerDown } = usePlanGestures(box, setView, turnBy)

  // A piece clicked in the drawing, not the end of a pan.
  const onPiece = useCallback(
    (id: string) => {
      if (!moved.current) viewClicks.onPiece(id)
    },
    [moved, viewClicks]
  )
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
        isClickable: viewClicks.isClickable,
        onPiece,
        drawings,
      }),
    [objects, surfaces.wall, surfaces.floorInside, styleOf, viewClicks, onPiece, drawings]
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
  const insets: Insets = phoneChrome
    ? { top: phoneChrome.top + 12, bottom: phoneChrome.bottom + 68, left: 16, right: 16 }
    : { ...FIT_PAD, right: padRight }
  const frame = useRef<Frame>({ size, bounds: scene.bounds, insets })
  frame.current = { size, bounds: scene.bounds, insets }
  const hasContent = !!scene.bounds
  const measured = size !== null
  useLayoutEffect(() => {
    const { size: frameSize, bounds, insets: padding } = frame.current
    if (frameSize && bounds) setView(fitView(bounds, frameSize.width, frameSize.height, padding))
  }, [fitNonce, hasContent, measured, turn])

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
      onPointerDown={onPointerDown}
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
                layout={layout}
                turn={turn}
                view={plan.view}
                size={size}
                colors={surfaces.contour}
              />
            )}
            {scene.node}
            {svgLayers.map((Layer, index) => (
              <Layer key={index} plan={plan} />
            ))}
          </g>
        )}
      </svg>

      {plan && overlays.map((Overlay, index) => <Overlay key={index} plan={plan} />)}

      {phoneChrome && (
        <PhoneControls bottom={phoneChrome.bottom + 12} onTurn={turnBy} onFit={requestFit} />
      )}
    </div>
  )
}
