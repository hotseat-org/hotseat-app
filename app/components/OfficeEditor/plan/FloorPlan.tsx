import { Button } from "@heroui/react"
import clsx from "clsx"
import { createPortal } from "react-dom"
import { Pin, RotateCcw, RotateCw, Scan } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { routeBounds, useRoute } from "../wayfinding"
import { useEditorStore } from "../store"
import {
  FLOOR_PART,
  edgeDirection,
  edgeNodes,
  enclosedRegions,
  footprintCells,
  isDiagonalEdge,
  runsAlongX,
  SEG,
  toRotationStep,
  type FloorCell,
} from "../layout"
import { SURFACES, type SurfacePalette } from "../palette"
import { tilesCovering, useLandscape } from "../contours"
import { personByEmail, usePeople, type Person } from "../people"
import { SeatAvatar } from "../SeatAvatar"
import { spotFor } from "../seatSpot"
import { SeatCardBody, useSeatCard } from "../seatCard"
import { heatColor } from "../heatmap"
import { useDeskFilter, useDesksOnDay, type DeskOnDay } from "../useBooking"
import { GRID, isEdgeType, isMarker, isSeatable, type Cell, type SceneObject } from "../types"
import { isTypingTarget } from "../keyboard"
import { createWheelReader, getSmoothZoomFactor, getStepZoomFactor } from "../wheel"
import { WALL } from "../objects/dimensions"
import { floorRect, mix, shade, sortBottomToTop, type Drawable, type Extent } from "./shapes"
import { drawPiece, WINDOW_GLASS } from "./kits"
import { useI18n } from "~/i18n/I18nProvider"

/** Screen pixels per plan unit: the zoom range. */
const MIN_K = 8
const MAX_K = 220
/** Room kept clear of the floating chrome when fitting (px). */
const FIT_PAD = { top: 96, bottom: 112, left: 112 }

/** Screen space (px) kept clear around the office when fitting it. */
type Insets = { top: number; bottom: number; left: number; right: number }
/** Name tags show once desks are big enough to tell apart. */
const TAG_ZOOM = 22
/** Bringing a desk into view: at least this zoom (px per plan unit)… */
const SPOTLIGHT_K = 44
/** …gliding there over this long (ms); the highlight then ripples this long. */
const SPOTLIGHT_GLIDE_MS = 450
const SPOTLIGHT_MS = 2700
/** A press that moves further than this is a pan, not a click (px). */
const DRAG = 4
/** A booked desk's avatar on its chair: this wide in plan units, but never smaller on screen than… */
const AVATAR_SIZE = 0.8
/** …this (px) — so who sits where reads even with the whole office in view. */
const MIN_AVATAR_PX = 30
/** …nor bigger than this (px), so close up it doesn't bury the desk. */
const MAX_AVATAR_PX = 56
/** A free desk's marker (the "+" ring), radius in plan units. */
const FREE_MARK = 0.2
/** How far furniture that can't be tapped fades toward the floor (0…1). */
const MUTED = 0.55
/** Up to this height (m) a piece lies flat on the floor (rugs): under the shadows. */
const FLAT = 0.02

/** The viewer's last view angle (quarter turns), remembered per browser. */
const TURN_KEY = "office-editor:plan-turn"
const readTurn = () => {
  try {
    return Number(localStorage.getItem(TURN_KEY)) & 3
  } catch {
    return 0
  }
}

/**
 * The layout turned by `q` quarter turns about the origin (the same Y-rotation
 * convention as the pieces' own). Turning the world instead of the camera keeps
 * everything axis-aligned on the grid — cells and edges land on cells and
 * edges — so the drawing, its walls and its depth sort work unchanged.
 */
const turnPoint = (x: number, z: number, q: number): [number, number] => {
  const t = (q * Math.PI) / 2
  const c = Math.round(Math.cos(t))
  const s = Math.round(Math.sin(t))
  return [x * c + z * s, -x * s + z * c]
}
const turnObject = (o: SceneObject, q: number): SceneObject => {
  if (!q) return o
  const [x, z] = turnPoint(o.x, o.z, q)
  // Exact steps: helpers like runsAlongX expect clean values. Furniture keeps
  // its eighth (a desk at 45° stays at 45°); walls and openings, quarters.
  if (isEdgeType(o.type)) {
    const quarters = (Math.round(o.rotation / (Math.PI / 2)) + q) & 3
    return { ...o, x, z, rotation: (quarters * Math.PI) / 2 }
  }
  return { ...o, x, z, rotation: toRotationStep(o.rotation + (q * Math.PI) / 2) }
}

interface View {
  /** Pixels per plan unit. */
  k: number
  tx: number
  ty: number
}

type Bounds = { x0: number; x1: number; y0: number; y1: number }

const fitView = (b: Bounds, w: number, h: number, pad: Insets): View => {
  const aw = Math.max(1, w - pad.left - pad.right)
  const ah = Math.max(1, h - pad.top - pad.bottom)
  const bw = Math.max(1, b.x1 - b.x0)
  const bh = Math.max(1, b.y1 - b.y0)
  const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(aw / bw, ah / bh)))
  return {
    k,
    tx: pad.left + aw / 2 - ((b.x0 + b.x1) / 2) * k,
    ty: pad.top + ah / 2 - ((b.y0 + b.y1) / 2) * k,
  }
}

/**
 * Simple mode: the office as a top-down plan (SVG) — for phones, devices that
 * struggle with the 3D scene, or no WebGL at all. Same data and booking as 3D:
 * walls, doors and furniture seen from above, desks marked by who's in on the
 * shown day (their pet; a "+" ring when free), and the same desk card on tap.
 * Drag to pan; wheel, two-finger scroll or pinch to zoom; Q / E to turn; Fit
 * (bottom bar) re-frames it.
 *
 * On a phone (`phoneChrome`: what the phone shell covers at the top and
 * bottom) the office fits between that chrome, the turn / fit buttons sit just
 * above the bottom of it, and a tapped desk opens as a bottom sheet.
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
  const { t } = useI18n()
  const layout = useEditorStore((s) => s.objects)
  const fitNonce = useEditorStore((s) => s.fitNonce)
  const requestFit = useEditorStore((s) => s.requestFit)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)
  const closeSeatCard = useEditorStore((s) => s.closeSeatCard)
  const bookingOn = useEditorStore((s) => s.booking.enabled)
  const past = useEditorStore((s) => s.booking.day < s.booking.today)
  const { desks: deskStates } = useDesksOnDay()
  const matchesFilter = useDeskFilter()
  // Insights' heatmap: desks on coloured pads, tagged with their share of days.
  const heatmap = useEditorStore((s) => s.heatmap)
  const people = usePeople()
  const card = useSeatCard()
  const surfaces = dark ? SURFACES.dark : SURFACES.light

  // View angle: the whole layout turned by quarter turns (see turnObject).
  const [turn, setTurn] = useState(readTurn)
  const turnBy = (d: number) =>
    setTurn((q) => {
      const next = (q + d) & 3
      try {
        localStorage.setItem(TURN_KEY, String(next))
      } catch {
        // Not remembered — fine.
      }
      return next
    })
  const objects = useMemo(() => layout.map((o) => turnObject(o, turn)), [layout, turn])
  const desks = useMemo(
    () => deskStates.map((d) => ({ ...d, desk: turnObject(d.desk, turn) })),
    [deskStates, turn]
  )

  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [view, setView] = useState<View | null>(null)
  const moved = useRef(false)

  // The whole drawing (memoized: panning only changes the transform).
  const scene = useMemo(
    () =>
      buildScene({
        objects,
        desks,
        wall: surfaces.wall,
        floorInside: surfaces.floorInside,
        bookable: bookingOn && !past && !heatmap,
        matches: matchesFilter,
        heat: heatmap ? { ratios: heatmap.ratios, isDark: dark } : undefined,
        freeTitle: t("Free — tap to book"),
        onDesk: (id) => {
          if (!moved.current) openSeatCard(id)
        },
      }),
    [
      objects,
      desks,
      surfaces.wall,
      surfaces.floorInside,
      bookingOn,
      past,
      openSeatCard,
      matchesFilter,
      heatmap,
      dark,
      t,
    ]
  )

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height })
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Frame the office on open, on Fit, and when the layout first gets content —
  // but not on every layout or size change (that would undo the viewer's pan).
  const insets: Insets = phoneChrome
    ? { top: phoneChrome.top + 12, bottom: phoneChrome.bottom + 68, left: 16, right: 16 }
    : { ...FIT_PAD, right: padRight }
  const latest = useRef({ size, bounds: scene.bounds, insets })
  latest.current = { size, bounds: scene.bounds, insets }
  const hasContent = !!scene.bounds
  const measured = size !== null
  useLayoutEffect(() => {
    const { size: s, bounds: b, insets: pad } = latest.current
    if (s && b) setView(fitView(b, s.w, s.h, pad))
  }, [fitNonce, hasContent, measured, turn])

  // --- Spotlight: glide to a desk ("Show my desk", "Find") and ripple on it.
  const spotlight = useEditorStore((s) => s.spotlight)
  const resetSpotlight = useEditorStore((s) => s.resetSpotlight)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const hasView = view !== null
  const glide = useRef({ frame: 0, timer: undefined as ReturnType<typeof setTimeout> | undefined })
  useEffect(() => {
    const current = glide.current
    return () => {
      cancelAnimationFrame(current.frame)
      clearTimeout(current.timer)
    }
  }, [])
  /** Glide the view from `from` to `to` (instant with reduced motion). */
  const glideTo = useCallback((from: View, to: View) => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const start = performance.now()
    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / SPOTLIGHT_GLIDE_MS)
      const e = 1 - (1 - t) ** 3
      setView({
        k: from.k + (to.k - from.k) * e,
        tx: from.tx + (to.tx - from.tx) * e,
        ty: from.ty + (to.ty - from.ty) * e,
      })
      if (t < 1) glide.current.frame = requestAnimationFrame(step)
    }
    cancelAnimationFrame(glide.current.frame)
    glide.current.frame = requestAnimationFrame(step)
  }, [])
  useEffect(() => {
    const from = viewRef.current
    const { size: s, insets: pad } = latest.current
    if (!spotlight || !from || !s) return
    resetSpotlight()
    const target =
      scene.occupants.get(spotlight.id) ?? desks.find((d) => d.desk.id === spotlight.id)?.desk
    if (!target) return
    const k = Math.min(MAX_K, Math.max(from.k, SPOTLIGHT_K))
    const cx = pad.left + (s.w - pad.left - pad.right) / 2
    const cy = pad.top + (s.h - pad.top - pad.bottom) / 2
    const to = { k, tx: cx - target.x * k, ty: cy - target.z * k }
    // Clearing the request re-runs this effect: the glide outlives it.
    clearTimeout(glide.current.timer)
    glideTo(from, to)
    setHighlightId(spotlight.id)
    glide.current.timer = setTimeout(() => setHighlightId(null), SPOTLIGHT_GLIDE_MS + SPOTLIGHT_MS)
  }, [spotlight, hasView, scene, desks, resetSpotlight, glideTo])

  // --- The way to a desk: the route (turned with the plan), framed once shown.
  const route = useRoute()
  const routeNonce = route?.path ? route.nonce : null
  const routePoints = useMemo(
    () => route?.path?.points.map(([x, z]) => turnPoint(x, z, turn)),
    [route?.path, turn]
  )
  useEffect(() => {
    const from = viewRef.current
    const { size: s, insets: pad } = latest.current
    if (!routePoints || !from || !s) return
    const b = routeBounds(routePoints)
    glideTo(from, fitView({ x0: b.x0, x1: b.x1, y0: b.z0, y1: b.z1 }, s.w, s.h, pad))
    // Only when a way is asked for (or the plan first has a view) — not on every pan.
  }, [routeNonce, hasView])

  // --- Pan (drag) and zoom (wheel, pinch) --------------------------------
  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) =>
      setView((v) => {
        if (!v) return v
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor))
        const f = k / v.k
        return { k, tx: cx - (cx - v.tx) * f, ty: cy - (cy - v.ty) * f }
      }),
    []
  )

  // Same reading as the 3D view: wheel, two-finger scroll and pinch all zoom.
  // (⌥ + scroll orbits there; quarter turns don't scroll, so it's ignored here.)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const readWheel = createWheelReader()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const intent = readWheel(e)
      if (intent === "rotate" || e.deltaY === 0) return
      const r = el.getBoundingClientRect()
      const factor =
        intent === "smoothZoom" ? getSmoothZoomFactor(e.deltaY) : getStepZoomFactor(e.deltaY)
      zoomAt(factor, e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  // Keys, as in the 3D view: Q / E turn (a quarter turn here), + / − zoom.
  const turnByRef = useRef(turnBy)
  turnByRef.current = turnBy
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "q") return turnByRef.current(1)
      if (k === "e") return turnByRef.current(-1)
      const el = box.current
      const factor = k === "+" || k === "=" ? 1.25 : k === "-" || k === "_" ? 1 / 1.25 : 0
      if (factor && el) zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [zoomAt])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // One set of window listeners serves every finger (a second finger just
    // joins the gesture as a pinch).
    if (pointers.current.size > 1) return
    moved.current = false
    const start = { x: e.clientX, y: e.clientY }
    const el = box.current
    const move = (ev: PointerEvent) => {
      const prev = pointers.current.get(ev.pointerId)
      if (!prev) return
      const all = [...pointers.current.values()]
      if (pointers.current.size === 2 && el) {
        // Pinch: scale by the change in finger spread, around their midpoint.
        const other = all.find((p) => p !== prev) as { x: number; y: number }
        const before = Math.hypot(prev.x - other.x, prev.y - other.y)
        const after = Math.hypot(ev.clientX - other.x, ev.clientY - other.y)
        const r = el.getBoundingClientRect()
        if (before > 0)
          zoomAt(
            after / before,
            (ev.clientX + other.x) / 2 - r.left,
            (ev.clientY + other.y) / 2 - r.top
          )
        moved.current = true
      } else {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > DRAG) moved.current = true
        if (moved.current) {
          const dx = ev.clientX - prev.x
          const dy = ev.clientY - prev.y
          setView((v) => v && { ...v, tx: v.tx + dx, ty: v.ty + dy })
        }
      }
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    }
    const up = (ev: PointerEvent) => {
      pointers.current.delete(ev.pointerId)
      if (pointers.current.size > 0) return
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  /** A world point on screen (px, within the plan). */
  const screen = (x: number, z: number) => {
    if (!view) return { left: 0, top: 0 }
    return { left: x * view.k + view.tx, top: z * view.k + view.ty }
  }
  const openId = card?.seat.id
  const avatarSize = view
    ? Math.min(MAX_AVATAR_PX, Math.max(MIN_AVATAR_PX, AVATAR_SIZE * view.k))
    : MIN_AVATAR_PX
  // The card's desk comes from the store, so it's turned here to match.
  const cardAt = card && turnPoint(card.seat.x, card.seat.z, turn)

  return (
    <div
      ref={box}
      className="absolute inset-0 touch-none select-none overflow-hidden"
      style={{ background: surfaces.planBackdrop }}
      onPointerDown={onPointerDown}
      // A click anywhere but a desk (they stop it) or the card closes the card;
      // the end of a pan doesn't.
      onClick={() => {
        if (!moved.current) closeSeatCard()
      }}
    >
      <svg className="absolute inset-0 size-full" aria-label="Office" role="img">
        {view && (
          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
            {size && (
              <ContourLines
                layout={layout}
                turn={turn}
                view={view}
                size={size}
                colors={surfaces.contour}
              />
            )}
            {scene.node}
            {routePoints && <RoutePath points={routePoints} k={view.k} />}
          </g>
        )}
      </svg>

      {/* Where the way ends: a ring pulsing round the desk's chair. */}
      {view && routePoints && (
        <div
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            ...screen(...routePoints[routePoints.length - 1]),
            width: avatarSize + 14,
            height: avatarSize + 14,
          }}
        >
          <span className="route-pulse absolute inset-0 rounded-full border-[3px] border-accent bg-accent/15 shadow-[0_0_16px_2px_var(--accent),inset_0_0_10px_var(--accent)]" />
        </div>
      )}

      {/* The spotlit desk: rings ripple out from it. */}
      {view &&
        highlightId &&
        (() => {
          const target =
            scene.occupants.get(highlightId) ?? desks.find((d) => d.desk.id === highlightId)?.desk
          if (!target) return null
          const ring = avatarSize + 14
          return (
            <div
              aria-hidden
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ ...screen(target.x, target.z), width: ring, height: ring }}
            >
              <span className="absolute inset-0 rounded-full border-[3px] border-accent bg-accent/15" />
              <span className="spotlight absolute inset-0 rounded-full border-[3px] border-accent" />
            </div>
          )
        })()}

      {/* Who sits where — HTML, at least MIN_AVATAR_PX at any zoom. */}
      {view &&
        !heatmap &&
        [...scene.occupants.values()].map((o) =>
          o.id === openId ? null : (
            <Occupant
              key={o.id}
              person={personByEmail(people, o.email)}
              email={o.email}
              isMine={o.email === people.me?.email}
              size={avatarSize}
              style={screen(o.x, o.z)}
              onClick={(e) => {
                e.stopPropagation()
                if (!moved.current) openSeatCard(o.id)
              }}
            />
          )
        )}

      {/* Name tags — HTML, so they stay legible at any zoom. */}
      {/* Heatmap: every desk's share of days in use. */}
      {view &&
        heatmap &&
        desks.map(({ desk }) =>
          desk.id in heatmap.ratios ? (
            <div
              key={desk.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2 hover:z-10"
              style={screen(desk.x, desk.z)}
            >
              {/* Just the share (desks sit close together); the desk on hover. */}
              <span className="flex cursor-default items-center gap-1 whitespace-nowrap rounded-full border border-border bg-overlay/95 px-1.5 text-[10px] font-extrabold leading-4 text-foreground shadow-overlay">
                {desk.label && (
                  <span className="hidden opacity-70 group-hover:inline">{desk.label}</span>
                )}
                {/* The bar chart, flat: as full as the desk's share of days. */}
                <span
                  aria-hidden
                  className="h-1.5 w-5 overflow-hidden rounded-full bg-foreground/10"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(4, heatmap.ratios[desk.id] * 100)}%`,
                      background: heatColor(heatmap.ratios[desk.id], dark),
                    }}
                  />
                </span>
                {Math.round(heatmap.ratios[desk.id] * 100)}%
              </span>
            </div>
          ) : null
        )}

      {view &&
        !heatmap &&
        view.k >= TAG_ZOOM &&
        desks.map(({ desk, state }) => {
          if (desk.id === openId) return null
          const person = state.kind === "free" ? null : personByEmail(people, state.email)
          const free = state.kind === "free" && bookingOn && !past
          // Filtered out: no tag for a free desk (its taker still shows).
          if (free && !matchesFilter(desk)) return null
          // A free desk already shows its "+" ring: a tag only for its label.
          if (!person && !desk.label) return null
          const mine = !!person && person.email === people.me?.email
          // A booked desk's tag sits just above its avatar.
          const occupant = scene.occupants.get(desk.id)
          const at = occupant ? screen(occupant.x, occupant.z) : screen(desk.x, desk.z - 0.45)
          if (occupant) at.top -= avatarSize / 2 + 3
          return (
            <div
              key={desk.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
              style={at}
            >
              <DeskTag
                person={person}
                label={desk.label}
                mine={mine}
                free={free}
                resident={state.kind === "resident"}
              />
            </div>
          )
        })}

      {/* Turn the view: bottom-left (where the 3D view keeps its FPS toggle);
          on a phone bottom-right above the shell, with Fit (no dock there). */}
      <div
        className={clsx(
          "absolute flex gap-1 rounded-xl border border-chrome-border bg-chrome/95 p-1 shadow-overlay backdrop-blur-md",
          phoneChrome ? "right-4" : "bottom-4 left-4"
        )}
        style={phoneChrome ? { bottom: phoneChrome.bottom + 12 } : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          isIconOnly
          size={phoneChrome ? "md" : "sm"}
          variant="ghost"
          aria-label={t("Turn view left")}
          onPress={() => turnBy(1)}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          isIconOnly
          size={phoneChrome ? "md" : "sm"}
          variant="ghost"
          aria-label={t("Turn view right")}
          onPress={() => turnBy(-1)}
        >
          <RotateCw className="size-4" />
        </Button>
        {phoneChrome && (
          <Button
            isIconOnly
            size="md"
            variant="ghost"
            aria-label={t("Fit the office")}
            onPress={requestFit}
          >
            <Scan className="size-4" />
          </Button>
        )}
      </div>

      {card &&
        (phoneChrome
          ? // A bottom sheet over the shell; tapping the dimmed plan closes it.
            // Portalled: the plan sits in its own (isolated) layer under the
            // shell, and the sheet must cover the shell's dock and tabs.
            createPortal(
              <div className="fixed inset-0 z-50 flex flex-col justify-end">
                <button
                  type="button"
                  aria-label={t("Close desk")}
                  className="absolute inset-0 bg-scrim"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    card.body.onClose()
                  }}
                />
                <div className="relative">
                  <SeatCardBody key={card.key} layout="sheet" {...card.body} />
                </div>
              </div>,
              document.body
            )
          : cardAt &&
            view && (
              <div className="absolute" style={screen(cardAt[0], cardAt[1])}>
                <SeatCardBody key={card.key} {...card.body} />
              </div>
            ))}
    </div>
  )
}

/** A booked desk: who sits there (tap for the desk's card). */
const Occupant = ({
  person,
  email,
  isMine,
  size,
  style,
  onClick,
}: {
  person: Person | null
  email: string
  isMine: boolean
  size: number
  style: CSSProperties
  onClick: (e: React.MouseEvent) => void
}) => {
  const { t } = useI18n()
  const name = person ? (isMine ? t("You") : person.name) : t("Taken")
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      onClick={onClick}
      // A finger-sized hit area round the small avatar.
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full before:absolute before:-inset-2 before:rounded-full before:content-['']"
      style={style}
    >
      <SeatAvatar person={person} email={email} isMine={isMine} size={size} />
    </button>
  )
}

const DeskTag = ({
  person,
  label,
  mine,
  free,
  resident,
}: {
  person: { name: string } | null
  label?: string
  mine: boolean
  free: boolean
  resident: boolean
}) => {
  const { t } = useI18n()
  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-overlay",
        mine
          ? "border-accent bg-accent text-accent-foreground"
          : free
            ? "border-success bg-success text-success-foreground"
            : "border-border bg-overlay/95 text-foreground"
      )}
    >
      {label && <span className="opacity-80">{label}</span>}
      {/* First name only: neighbouring desks' tags would collide. */}
      {person && <span>{mine ? t("You") : person.name.split(" ")[0]}</span>}
      {resident && <Pin className="size-3 opacity-70" aria-label={t("Permanent desk")} />}
    </div>
  )
}

/** A rough tile, for grouping: the visible world bounds snap to this (m). */
const VISIBLE_STEP = 16

/**
 * The endless contour map (see contours.ts), under the drawing: the plateau
 * the office stands on, then the lines of the tiles in view — turned with the
 * view, hairline at any zoom. Each tile's path is built once per turn.
 */
/**
 * The way to a desk on the plan: a glowing line — a blurred halo, a solid
 * core with a light sheen — with streaks of light running toward the desk,
 * and a glowing dot at the entrance. Plan units; strokes in screen pixels, and
 * the blur sized from the zoom (`k`), so it looks the same at any zoom.
 */
const RoutePath = ({ points, k }: { points: [number, number][]; k: number }) => {
  const d = points.map(([x, z], i) => `${i ? "L" : "M"}${x.toFixed(3)} ${z.toFixed(3)}`).join("")
  const [sx, sz] = points[0]
  // The filter's own box: the route's, with room for the glow.
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  const pad = 40 / k
  const box = {
    x: Math.min(...xs) - pad,
    y: Math.min(...zs) - pad,
    width: Math.max(...xs) - Math.min(...xs) + pad * 2,
    height: Math.max(...zs) - Math.min(...zs) + pad * 2,
  }
  const line = {
    d,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  }
  return (
    <g aria-hidden pointerEvents="none">
      <defs>
        <filter id="route-glow" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation={6 / k} />
        </filter>
        <filter id="route-shine" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation={2.5 / k} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        {...line}
        stroke="var(--accent)"
        strokeOpacity={0.55}
        strokeWidth={16}
        filter="url(#route-glow)"
      />
      <path {...line} stroke="var(--accent)" strokeWidth={4.5} />
      <path {...line} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.5} />
      <path
        {...line}
        className="route-flow"
        stroke="#ffffff"
        strokeWidth={4}
        strokeDasharray="10 70"
        filter="url(#route-shine)"
      />
      <circle
        cx={sx}
        cy={sz}
        r={0.5}
        fill="var(--accent)"
        fillOpacity={0.45}
        filter="url(#route-glow)"
      />
      <circle cx={sx} cy={sz} r={0.17} fill="var(--accent)" stroke="#ffffff" strokeWidth={0.05} />
    </g>
  )
}

/** The plan is about the office: its land is drawn quieter than in 3D. */
const PLAN_CONTOUR_OPACITY = 0.5

const ContourLines = ({
  layout,
  turn,
  view,
  size,
  colors,
}: {
  layout: SceneObject[]
  turn: number
  view: { k: number; tx: number; ty: number }
  size: { w: number; h: number }
  colors: SurfacePalette["contour"]
}) => {
  const land = useLandscape(layout)
  const paths = useRef(new Map<string, { minor: string; major: string }>())
  // A new landscape or turn: the cached paths no longer apply.
  const cacheFor = useRef<unknown>(null)
  if (cacheFor.current !== land || paths.current.size > 600) {
    paths.current.clear()
    cacheFor.current = land
  }

  // The world rectangle in view: the screen corners, un-turned (snapped, so
  // panning a little doesn't re-render).
  const corners = [
    [0, 0],
    [size.w, 0],
    [0, size.h],
    [size.w, size.h],
  ].map(([px, py]) => turnPoint((px - view.tx) / view.k, (py - view.ty) / view.k, (4 - turn) % 4))
  const snap = (v: number, up: boolean) =>
    (up ? Math.ceil(v / VISIBLE_STEP) : Math.floor(v / VISIBLE_STEP)) * VISIBLE_STEP
  const x0 = snap(Math.min(...corners.map((c) => c[0])), false)
  const x1 = snap(Math.max(...corners.map((c) => c[0])), true)
  const z0 = snap(Math.min(...corners.map((c) => c[1])), false)
  const z1 = snap(Math.max(...corners.map((c) => c[1])), true)

  const tiles = useMemo(() => tilesCovering(x0, z0, x1, z1), [x0, z0, x1, z1])
  const toPath = (segments: Float32Array) => {
    let d = ""
    for (let i = 0; i < segments.length; i += 4) {
      const [ax, az] = turnPoint(segments[i], segments[i + 1], turn)
      const [bx, bz] = turnPoint(segments[i + 2], segments[i + 3], turn)
      d += `M${ax.toFixed(2)} ${az.toFixed(2)}L${bx.toFixed(2)} ${bz.toFixed(2)}`
    }
    return d
  }
  const pathsOf = (tx: number, tz: number) => {
    const key = `${tx},${tz},${turn}`
    let p = paths.current.get(key)
    if (!p) {
      const t = land.tile(tx, tz)
      p = { minor: toPath(t.minor), major: toPath(t.major) }
      paths.current.set(key, p)
    }
    return p
  }

  // The plateau hugs the building: its outline(s), turned with the view
  // (even-odd, so a courtyard left open stays a hole).
  const plateau = land.plateau
    .map(
      (loop) =>
        loop
          .map(([x, z], i) => {
            const [tx, tz] = turnPoint(x, z, turn)
            return `${i ? "L" : "M"}${tx.toFixed(2)} ${tz.toFixed(2)}`
          })
          .join("") + "Z"
    )
    .join("")
  return (
    <g aria-hidden>
      <path
        d={plateau}
        fillRule="evenodd"
        fill={colors.plateau}
        stroke={colors.major}
        strokeOpacity={PLAN_CONTOUR_OPACITY}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {tiles.map(([tx, tz]) => {
        const t = pathsOf(tx, tz)
        return (
          <g key={`${tx},${tz}`} opacity={PLAN_CONTOUR_OPACITY}>
            <path
              d={t.minor}
              stroke={colors.minor}
              strokeWidth={1.2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={t.major}
              stroke={colors.major}
              strokeWidth={2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </g>
  )
}

interface SceneInput {
  objects: SceneObject[]
  desks: DeskOnDay[]
  wall: string
  floorInside: string
  bookable: boolean
  /** Does a desk pass the map's desk filter? */
  matches: (desk: SceneObject) => boolean
  onDesk: (id: string) => void
  /** Insights' heatmap: each desk's share of days in use (pads under them). */
  heat?: { ratios: Record<string, number>; isDark: boolean }
  /** A free desk's tooltip (translated). */
  freeTitle: string
}

/**
 * Everything in plan units (metres, top-down): the rooms' floor, then walls,
 * doors and furniture layered bottom to top, then desk markers for the shown
 * day — and the drawing's bounds (for fitting).
 */
const buildScene = ({
  objects,
  desks,
  wall,
  floorInside,
  bookable,
  matches,
  heat,
  freeTitle,
  onDesk,
}: SceneInput) => {
  // Panning reuses this whole element (memoized), so React skips it entirely.
  const paints = objects.filter((o) => o.type === "floorPaint" && o.color)
  const byId = new Map(desks.map((d) => [d.desk.id, d]))
  const seats = objects.filter((o) => o.type === "seat")

  /** Furniture that can't be tapped, blended this far toward the floor. */
  const subdue = (color: string) => mix(color, floorInside, MUTED)
  const drawables: Drawable[] = []
  /** Furniture's soft shadows: one layer over the floor and rugs, under the pieces. */
  const shadows: ReactNode[] = []
  /** Drawn over everything: which desks are free. */
  const markers: ReactNode[] = []
  /** The heatmap's pads, on the floor under the desks. */
  const heatPads: ReactNode[] = []
  /** Who sits where: their chair's spot (plan units), for the HTML layer. */
  const occupants = new Map<string, { id: string; x: number; z: number; email: string }>()
  const t = WALL.depth / 2
  const push = (ext: Extent, node: ReactNode) =>
    drawables.push({ ext, node, order: drawables.length })

  /**
   * A wall piece along its line from `from` to `to` (world coords along the
   * run; `fixed` across it), full thickness. Its ends overlap the neighbours
   * by half a wall, so corners close.
   */
  const wallPiece = (
    alongX: boolean,
    fixed: number,
    from: number,
    to: number,
    color: string,
    { opacity = 1, extend = t, across = t, y1 = WALL.height } = {}
  ) => {
    const lo = from - extend
    const hi = to + extend
    const ext: Extent = alongX
      ? { x0: lo, x1: hi, z0: fixed - across, z1: fixed + across, y0: 0, y1 }
      : { x0: fixed - across, x1: fixed + across, z0: lo, z1: hi, y0: 0, y1 }
    push(
      ext,
      <rect
        x={ext.x0}
        y={ext.z0}
        width={ext.x1 - ext.x0}
        height={ext.z1 - ext.z0}
        fill={color}
        opacity={opacity < 1 ? opacity : undefined}
      />
    )
  }

  /** A wall piece on a diagonal, from node `a` to `b`: a turned bar, its ends overlapping corners. */
  const diagonalWallPiece = (
    a: Cell,
    b: Cell,
    color: string,
    { opacity = 1, extend = t, across = t, y1 = WALL.height } = {}
  ) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z)
    const [ux, uz] = [(b.x - a.x) / length, (b.z - a.z) / length]
    const [nx, nz] = [-uz * across, ux * across]
    const [ax, az] = [a.x - ux * extend, a.z - uz * extend]
    const [bx, bz] = [b.x + ux * extend, b.z + uz * extend]
    const corners = [
      [ax + nx, az + nz],
      [bx + nx, bz + nz],
      [bx - nx, bz - nz],
      [ax - nx, az - nz],
    ]
    const xs = corners.map((c) => c[0])
    const zs = corners.map((c) => c[1])
    push(
      {
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        z0: Math.min(...zs),
        z1: Math.max(...zs),
        y0: 0,
        y1,
      },
      <polygon
        points={corners.map((c) => c.join(",")).join(" ")}
        fill={color}
        opacity={opacity < 1 ? opacity : undefined}
      />
    )
  }

  // Plain and glass walls merge into straight runs of the same colour — one
  // piece per run, so no seams between half-metre segments.
  const runs = new Map<
    string,
    { alongX: boolean; fixed: number; at: number[]; color: string; glass: boolean }
  >()
  const diagonalRuns = new Map<
    string,
    { rotation: number; at: SceneObject[]; color: string; glass: boolean }
  >()
  for (const o of objects) {
    if (o.type !== "wall" && o.type !== "glassWall") continue
    if (isDiagonalEdge(o.rotation)) {
      // Diagonal: runs on the lines where x − z (rising) or x + z (falling) holds.
      const glass = o.type === "glassWall"
      const color = glass ? WINDOW_GLASS : (o.color ?? wall)
      const isRising = edgeDirection(o.rotation) === "rising"
      const key = `${isRising}|${isRising ? o.x - o.z : o.x + o.z}|${glass}|${color}`
      const run = diagonalRuns.get(key) ?? { rotation: o.rotation, at: [], color, glass }
      run.at.push(o)
      diagonalRuns.set(key, run)
      continue
    }
    const alongX = runsAlongX(o.rotation)
    const glass = o.type === "glassWall"
    const color = glass ? WINDOW_GLASS : (o.color ?? wall)
    const fixed = alongX ? o.z : o.x
    const key = `${alongX}|${fixed}|${glass}|${color}`
    const run = runs.get(key) ?? { alongX, fixed, at: [], color, glass }
    run.at.push(alongX ? o.x : o.z)
    runs.set(key, run)
  }
  for (const r of runs.values()) {
    r.at.sort((p, q) => p - q)
    let start = r.at[0]
    let prev = r.at[0]
    const flush = () =>
      wallPiece(r.alongX, r.fixed, start - SEG / 2, prev + SEG / 2, r.color, {
        // Glass partitions: a slimmer, see-through line.
        opacity: r.glass ? 0.8 : 1,
        across: r.glass ? t * 0.5 : t,
      })
    for (const v of r.at.slice(1)) {
      if (Math.abs(v - prev - SEG) > 1e-6) {
        flush()
        start = v
      }
      prev = v
    }
    flush()
  }

  for (const r of diagonalRuns.values()) {
    r.at.sort((p, q) => p.x - q.x)
    let start = r.at[0]
    let prev = r.at[0]
    const flush = () => {
      const [a] = edgeNodes(start)
      const [, b] = edgeNodes(prev)
      diagonalWallPiece(a, b, r.color, {
        opacity: r.glass ? 0.8 : 1,
        across: r.glass ? t * 0.5 : t,
      })
    }
    for (const o of r.at.slice(1)) {
      if (Math.abs(o.x - prev.x - SEG) > 1e-6) {
        flush()
        start = o
      }
      prev = o
    }
    flush()
  }

  // Windows: the wall with a pane of glass along its middle. Doors: the gap
  // between two jambs, the leaf standing open and its swing — a plan's door.
  for (const o of objects) {
    if (o.type !== "window" && o.type !== "door" && o.type !== "glassDoor") continue
    const [a, b] = edgeNodes(o)
    if (isDiagonalEdge(o.rotation)) {
      // On a diagonal: a window is wall with glass down its middle; a door, its
      // two jambs, and its leaf standing open with its swing, as straight ones.
      if (o.type === "window") {
        diagonalWallPiece(a, b, o.color ?? wall, {})
        diagonalWallPiece(a, b, WINDOW_GLASS, { extend: -0.06, across: t * 0.35 })
        continue
      }
      const post = 0.1
      const span = Math.hypot(b.x - a.x, b.z - a.z)
      const along = { x: (b.x - a.x) / span, z: (b.z - a.z) / span }
      const lerp = (d: number) => ({ x: a.x + along.x * d, z: a.z + along.z * d })
      const frame = o.type === "glassDoor" ? "#5b6577" : (o.color ?? wall)
      diagonalWallPiece(a, lerp(post), frame, { extend: 0 })
      diagonalWallPiece(lerp(span - post), b, frame, { extend: 0 })
      // Hinged at the first jamb, the leaf opens to the door's front (its +Z);
      // the swing runs from where it shuts to where it stands.
      const front = { x: Math.sin(o.rotation), z: Math.cos(o.rotation) }
      const len = span - post * 2
      const hinge = lerp(post)
      const shut = lerp(post + len)
      const open = { x: hinge.x + front.x * len, z: hinge.z + front.z * len }
      const sweep = along.x * front.z - along.z * front.x > 0 ? 1 : 0
      const leafColor = o.type === "glassDoor" ? WINDOW_GLASS : (o.color ?? "#d98a63")
      push(
        { x0: hinge.x, x1: hinge.x, z0: hinge.z, z1: hinge.z, y0: 0, y1: 0.02 },
        <g>
          <path
            d={`M${shut.x} ${shut.z} A${len} ${len} 0 0 ${sweep} ${open.x} ${open.z}`}
            fill="none"
            stroke={shade(wall, 0.7)}
            strokeWidth={0.02}
            strokeDasharray="0.06 0.05"
          />
          <line
            x1={hinge.x}
            y1={hinge.z}
            x2={open.x}
            y2={open.z}
            stroke={leafColor}
            strokeWidth={0.06}
            strokeLinecap="round"
          />
        </g>
      )
      continue
    }
    const alongX = runsAlongX(o.rotation)
    const fixed = alongX ? a.z : a.x
    const [from, to] = alongX
      ? [Math.min(a.x, b.x), Math.max(a.x, b.x)]
      : [Math.min(a.z, b.z), Math.max(a.z, b.z)]
    if (o.type === "window") {
      wallPiece(alongX, fixed, from, to, o.color ?? wall)
      wallPiece(alongX, fixed, from, to, WINDOW_GLASS, { extend: -0.06, across: t * 0.35 })
      continue
    }
    const post = 0.1
    const frame = o.type === "glassDoor" ? "#5b6577" : (o.color ?? wall)
    wallPiece(alongX, fixed, from, from + post, frame, { extend: 0 })
    wallPiece(alongX, fixed, to - post, to, frame, { extend: 0 })
    // The leaf opens to the door's front (its +Z), hinged at the `from` jamb.
    const side = alongX
      ? Math.sign(Math.cos(o.rotation)) || 1
      : Math.sign(Math.sin(o.rotation)) || 1
    const len = to - from - post * 2
    const hinge = from + post
    const at = (u: number, v: number): [number, number] => (alongX ? [u, v] : [v, u])
    const [hx, hz] = at(hinge, fixed)
    const [ox, oz] = at(hinge + len, fixed)
    const [lx, lz] = at(hinge, fixed + side * len)
    const leafColor = o.type === "glassDoor" ? WINDOW_GLASS : (o.color ?? "#d98a63")
    push(
      { x0: hx, x1: hx, z0: hz, z1: hz, y0: 0, y1: 0.02 },
      <g>
        <path
          d={`M${ox} ${oz} A${len} ${len} 0 0 ${alongX === side > 0 ? 1 : 0} ${lx} ${lz}`}
          fill="none"
          stroke={shade(wall, 0.7)}
          strokeWidth={0.02}
          strokeDasharray="0.06 0.05"
        />
        <line
          x1={hx}
          y1={hz}
          x2={lx}
          y2={lz}
          stroke={leafColor}
          strokeWidth={0.06}
          strokeLinecap="round"
        />
      </g>
    )
  }

  // --- Furniture, desks (tap to open) and whoever sits at them.
  for (const o of objects) {
    if (isEdgeType(o.type) || isMarker(o.type)) continue
    const on = byId.get(o.id)
    const seatable = isSeatable(o.type)
    const taken = !!on && on.state.kind !== "free"
    // Filtered out (the map's desk filter): faded, and no "+" to book it.
    const isDimmed = seatable && !matches(o)
    if (seatable && heat && o.id in heat.ratios) {
      const [hx, hz] = footprintCells(o.type, o.rotation)
      const w = hx * GRID + 0.16
      const d = hz * GRID + 0.16
      heatPads.push(
        <rect
          key={`heat-${o.id}`}
          x={o.x - w / 2}
          y={o.z - d / 2}
          width={w}
          height={d}
          rx={0.25}
          fill={heatColor(heat.ratios[o.id], heat.isDark)}
          opacity={0.9}
        />
      )
    }
    // Can't be tapped: muted toward the floor, so desks stand out.
    const piece = seatable
      ? drawPiece(o, { occupied: bookable || taken ? taken : undefined })
      : drawPiece(o, {}, subdue)
    if (!piece) continue
    const open = (e: React.MouseEvent) => {
      e.stopPropagation()
      onDesk(o.id)
    }
    // The symbol is drawn in the piece's frame: move and turn it into place
    // (its +Z front turned by `rotation`, as in 3D). The shadow falls the same
    // way for every piece: down and to the right.
    const turn = (-o.rotation * 180) / Math.PI
    const [cx, cz] = footprintCells(o.type, o.rotation)
    push(
      {
        x0: o.x - (cx * GRID) / 2,
        x1: o.x + (cx * GRID) / 2,
        z0: o.z - (cz * GRID) / 2,
        z1: o.z + (cz * GRID) / 2,
        y0: 0,
        y1: piece.height,
      },
      <g
        transform={`translate(${o.x} ${o.z}) rotate(${turn})`}
        className={seatable ? "cursor-pointer" : undefined}
        onClick={seatable ? open : undefined}
        opacity={isDimmed ? 0.3 : undefined}
      >
        {piece.node}
      </g>
    )
    if (piece.height > 0.05)
      shadows.push(
        <g key={o.id} transform={`translate(${o.x + 0.04} ${o.z + 0.07}) rotate(${turn})`}>
          {piece.silhouette}
        </g>
      )
    if (!seatable || !on) continue
    const spot = spotFor(o, seats)
    if (on.state.kind === "free") {
      if (!bookable || isDimmed) continue
      // Free to book: the "+" ring on the seat.
      const r = FREE_MARK
      markers.push(
        <g key={o.id} className="cursor-pointer" onClick={open}>
          <title>{freeTitle}</title>
          <circle
            cx={spot.x}
            cy={spot.z}
            r={r}
            className="fill-overlay stroke-success"
            strokeWidth={0.045}
          />
          <path
            d={`M${spot.x - r * 0.45} ${spot.z}h${r * 0.9}M${spot.x} ${spot.z - r * 0.45}v${r * 0.9}`}
            className="stroke-success"
            strokeWidth={0.045}
            strokeLinecap="round"
          />
        </g>
      )
      continue
    }
    // Taken: who sits there — drawn over the plan in HTML (see Occupant).
    occupants.set(o.id, { id: o.id, x: spot.x, z: spot.z, email: on.state.email })
  }

  // --- The floor: rooms (each in its floor paint) as row-merged strips.
  const colorOf = new Map<string, string>()
  const rooms = new Map<string, ReactNode[]>()
  for (const region of enclosedRegions(objects)) {
    const paint = [...paints]
      .reverse()
      .find((p) =>
        region.some((c) => c.x <= p.x && p.x < c.x + SEG && c.z <= p.z && p.z < c.z + SEG)
      )
    const color = paint?.color ?? floorInside
    for (const c of region) {
      if (c.parts === undefined) {
        colorOf.set(`${c.x},${c.z}`, color)
        continue
      }
      // A square a diagonal wall cuts: just its quarters inside the room.
      const list = rooms.get(color) ?? []
      list.push(<path key={`cut ${c.x},${c.z}`} d={cutSquarePath(c)} />)
      rooms.set(color, list)
    }
  }
  const rows = new Map<number, number[]>()
  for (const key of colorOf.keys()) {
    const [x, z] = key.split(",").map(Number)
    rows.set(z, [...(rows.get(z) ?? []), x])
  }
  for (const [z, xs] of rows) {
    xs.sort((p, q) => p - q)
    const color = (x: number) => colorOf.get(`${x},${z}`) as string
    let start = xs[0]
    let prev = xs[0]
    const flush = () => {
      const list = rooms.get(color(start)) ?? []
      // A hair taller than the row, so neighbouring strips leave no hairline.
      list.push(floorRect(start, z, prev + SEG, z + SEG + 0.005, {}, `${z},${start}`))
      rooms.set(color(start), list)
    }
    for (const x of xs.slice(1)) {
      if (Math.abs(x - prev - SEG) > 1e-6 || color(x) !== color(start)) {
        flush()
        start = x
      }
      prev = x
    }
    flush()
  }

  let bounds: Bounds | null = null
  for (const { ext: e } of drawables) {
    bounds = bounds
      ? {
          x0: Math.min(bounds.x0, e.x0),
          x1: Math.max(bounds.x1, e.x1),
          y0: Math.min(bounds.y0, e.z0),
          y1: Math.max(bounds.y1, e.z1),
        }
      : { x0: e.x0, x1: e.x1, y0: e.z0, y1: e.z1 }
  }

  const layered = sortBottomToTop(drawables)
  return {
    bounds,
    occupants,
    node: (
      <>
        {[...rooms].map(([color, list]) => (
          <g key={color} fill={color}>
            {list}
          </g>
        ))}
        {heatPads}
        {layered
          .filter((d) => d.ext.y1 <= FLAT)
          .map((d, i) => (
            <g key={`flat${i}`}>{d.node}</g>
          ))}
        <g fill="#000000" opacity={0.13}>
          {shadows}
        </g>
        {layered
          .filter((d) => d.ext.y1 > FLAT)
          .map((d, i) => (
            <g key={i}>{d.node}</g>
          ))}
        {markers}
      </>
    ),
  }
}

/** The quarters of a cut square that are inside (FLOOR_PART bits), as one SVG path. */
const cutSquarePath = (c: FloorCell) => {
  const [x0, z0, x1, z1] = [c.x, c.z, c.x + SEG, c.z + SEG]
  const [cx, cz] = [c.x + SEG / 2, c.z + SEG / 2]
  const quarters: [number, [number, number], [number, number]][] = [
    [FLOOR_PART.south, [x0, z0], [x1, z0]],
    [FLOOR_PART.east, [x1, z0], [x1, z1]],
    [FLOOR_PART.north, [x1, z1], [x0, z1]],
    [FLOOR_PART.west, [x0, z1], [x0, z0]],
  ]
  return quarters
    .filter(([part]) => (c.parts ?? 0) & part)
    .map(([, a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${cx} ${cz}Z`)
    .join("")
}
