import { Button } from "@heroui/react"
import clsx from "clsx"
import { Pin, RotateCcw, RotateCw } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useEditorStore } from "../store"
import { edgeNodes, enclosedRegions, footprintCells, runsAlongX, SEG } from "../layout"
import { SURFACES } from "../palette"
import { personByEmail, usePeople, type People } from "../people"
import { petFor, petThumb } from "../models"
import { spotFor } from "../seatSpot"
import { SeatCardBody, useSeatCard } from "../seatCard"
import { useDesksOnDay, type DeskOnDay } from "../useBooking"
import { GRID, isEdgeType, isMarker, isSeatable, type SceneObject } from "../types"
import { isTypingTarget } from "../keyboard"
import { createWheelReader, getSmoothZoomFactor, getStepZoomFactor } from "../wheel"
import { WALL } from "../objects/dimensions"
import { floorRect, mix, shade, sortBottomToTop, type Drawable, type Extent } from "./shapes"
import { drawPiece, WINDOW_GLASS } from "./kits"

/** Screen pixels per plan unit: the zoom range. */
const MIN_K = 8
const MAX_K = 220
/** Room kept clear of the floating chrome when fitting (px). */
const FIT_PAD = { top: 96, bottom: 112, left: 112 }
/** Name tags show once desks are big enough to tell apart. */
const TAG_ZOOM = 22
/** A press that moves further than this is a pan, not a click (px). */
const DRAG = 4
/** A booked desk's pet: its picture's size, sitting on the chair. */
const PET_SIZE = 0.72
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
  // Snapped to an exact quarter turn: helpers like runsAlongX expect clean values.
  const quarters = (Math.round(o.rotation / (Math.PI / 2)) + q) & 3
  return { ...o, x, z, rotation: (quarters * Math.PI) / 2 }
}

interface View {
  /** Pixels per plan unit. */
  k: number
  tx: number
  ty: number
}

type Bounds = { x0: number; x1: number; y0: number; y1: number }

const fitView = (b: Bounds, w: number, h: number, right: number): View => {
  const aw = Math.max(1, w - FIT_PAD.left - right)
  const ah = Math.max(1, h - FIT_PAD.top - FIT_PAD.bottom)
  const bw = Math.max(1, b.x1 - b.x0)
  const bh = Math.max(1, b.y1 - b.y0)
  const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(aw / bw, ah / bh)))
  return {
    k,
    tx: FIT_PAD.left + aw / 2 - ((b.x0 + b.x1) / 2) * k,
    ty: FIT_PAD.top + ah / 2 - ((b.y0 + b.y1) / 2) * k,
  }
}

/**
 * Simple mode: the office as a top-down plan (SVG) — for phones, devices that
 * struggle with the 3D scene, or no WebGL at all. Same data and booking as 3D:
 * walls, doors and furniture seen from above, desks marked by who's in on the
 * shown day (their pet; a "+" ring when free), and the same desk card on tap.
 * Drag to pan; wheel, two-finger scroll or pinch to zoom; Q / E to turn; Fit
 * (bottom bar) re-frames it.
 */
export const FloorPlan = ({
  dark,
  padRight = 40,
}: {
  dark: boolean
  /** Screen space the right-hand panels cover, kept clear when fitting (px). */
  padRight?: number
}) => {
  const layout = useEditorStore((s) => s.objects)
  const fitNonce = useEditorStore((s) => s.fitNonce)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)
  const closeSeatCard = useEditorStore((s) => s.closeSeatCard)
  const bookingOn = useEditorStore((s) => s.booking.enabled)
  const past = useEditorStore((s) => s.booking.day < s.booking.today)
  const { desks: deskStates } = useDesksOnDay()
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
        people,
        wall: surfaces.wall,
        floorInside: surfaces.floorInside,
        bookable: bookingOn && !past,
        onDesk: (id) => {
          if (!moved.current) openSeatCard(id)
        },
      }),
    [objects, desks, people, surfaces.wall, surfaces.floorInside, bookingOn, past, openSeatCard]
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
  const latest = useRef({ size, bounds: scene.bounds, padRight })
  latest.current = { size, bounds: scene.bounds, padRight }
  const hasContent = !!scene.bounds
  const measured = size !== null
  useLayoutEffect(() => {
    const { size: s, bounds: b, padRight: right } = latest.current
    if (s && b) setView(fitView(b, s.w, s.h, right))
  }, [fitNonce, hasContent, measured, turn])

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
  // The card's desk comes from the store, so it's turned here to match.
  const cardAt = card && turnPoint(card.seat.x, card.seat.z, turn)

  return (
    <div
      ref={box}
      className="absolute inset-0 touch-none select-none overflow-hidden"
      style={{ background: surfaces.floor }}
      onPointerDown={onPointerDown}
      // A click anywhere but a desk (they stop it) or the card closes the card;
      // the end of a pan doesn't.
      onClick={() => {
        if (!moved.current) closeSeatCard()
      }}
    >
      <svg className="absolute inset-0 size-full" aria-label="Office" role="img">
        {view && (
          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>{scene.node}</g>
        )}
      </svg>

      {/* Name tags — HTML, so they stay legible at any zoom. */}
      {view &&
        view.k >= TAG_ZOOM &&
        desks.map(({ desk, state }) => {
          if (desk.id === openId) return null
          const person = state.kind === "free" ? null : personByEmail(people, state.email)
          const free = state.kind === "free" && bookingOn && !past
          // A free desk already shows its "+" ring: a tag only for its label.
          if (!person && !desk.label) return null
          const mine = !!person && person.email === people.me?.email
          return (
            <div
              key={desk.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
              style={screen(desk.x, desk.z - 0.45)}
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

      {/* Turn the view (bottom-left, where the 3D view keeps its FPS toggle). */}
      <div
        className="absolute bottom-4 left-4 flex gap-1 rounded-xl border border-border bg-overlay/90 p-1 shadow-overlay backdrop-blur-md"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Turn view left"
          onPress={() => turnBy(1)}
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Turn view right"
          onPress={() => turnBy(-1)}
        >
          <RotateCw className="size-4" />
        </Button>
      </div>

      {card && cardAt && view && (
        <div className="absolute" style={screen(cardAt[0], cardAt[1])}>
          <SeatCardBody key={card.key} {...card.body} />
        </div>
      )}
    </div>
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
}) => (
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
    {person && <span>{mine ? "You" : person.name}</span>}
    {resident && <Pin className="size-3 opacity-70" aria-label="Permanent desk" />}
  </div>
)

interface SceneInput {
  objects: SceneObject[]
  desks: DeskOnDay[]
  people: People
  wall: string
  floorInside: string
  bookable: boolean
  onDesk: (id: string) => void
}

/**
 * Everything in plan units (metres, top-down): the rooms' floor, then walls,
 * doors and furniture layered bottom to top, then desk markers for the shown
 * day — and the drawing's bounds (for fitting).
 */
const buildScene = ({
  objects,
  desks,
  people,
  wall,
  floorInside,
  bookable,
  onDesk,
}: SceneInput) => {
  // Panning reuses this whole element (memoized), so React skips it entirely.
  const paints = objects.filter((o) => o.type === "floorPaint" && o.color)
  const byId = new Map(desks.map((d) => [d.desk.id, d]))
  const seats = objects.filter((o) => o.type === "seat")
  const me = people.me?.email

  /** Furniture that can't be tapped, blended this far toward the floor. */
  const subdue = (color: string) => mix(color, floorInside, MUTED)
  const drawables: Drawable[] = []
  /** Furniture's soft shadows: one layer over the floor and rugs, under the pieces. */
  const shadows: ReactNode[] = []
  /** Drawn over everything: who sits where, and which desks are free. */
  const markers: ReactNode[] = []
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

  // Plain and glass walls merge into straight runs of the same colour — one
  // piece per run, so no seams between half-metre segments.
  const runs = new Map<
    string,
    { alongX: boolean; fixed: number; at: number[]; color: string; glass: boolean }
  >()
  for (const o of objects) {
    if (o.type !== "wall" && o.type !== "glassWall") continue
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

  // Windows: the wall with a pane of glass along its middle. Doors: the gap
  // between two jambs, the leaf standing open and its swing — a plan's door.
  for (const o of objects) {
    if (o.type !== "window" && o.type !== "door" && o.type !== "glassDoor") continue
    const [a, b] = edgeNodes(o)
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
      if (!bookable) continue
      // Free to book: the "+" ring on the seat.
      const r = FREE_MARK
      markers.push(
        <g key={o.id} className="cursor-pointer" onClick={open}>
          <title>Free — tap to book</title>
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
    // Taken: their desk pet (the same one as in 3D) on the chair — a picture
    // rendered from its model; yours on an accent ring.
    const state = on.state
    const person = personByEmail(people, state.email)
    const mine = state.email === me
    const pet = petFor(state.email, person?.pet)
    markers.push(
      <g key={o.id} className="cursor-pointer" onClick={open}>
        <title>{`${person ? (mine ? "You" : person.name) : "Taken"} · ${pet.label}`}</title>
        {mine && (
          <circle
            cx={spot.x}
            cy={spot.z}
            r={PET_SIZE * 0.42}
            className="fill-accent"
            stroke="#ffffff"
            strokeWidth={0.04}
          />
        )}
        <image
          href={petThumb(pet.id)}
          x={spot.x - PET_SIZE / 2}
          y={spot.z - PET_SIZE / 2}
          width={PET_SIZE}
          height={PET_SIZE}
        />
      </g>
    )
  }

  // --- The floor: rooms (each in its floor paint) as row-merged strips.
  const colorOf = new Map<string, string>()
  for (const region of enclosedRegions(objects)) {
    const paint = [...paints]
      .reverse()
      .find((p) =>
        region.some((c) => c.x <= p.x && p.x < c.x + SEG && c.z <= p.z && p.z < c.z + SEG)
      )
    for (const c of region) colorOf.set(`${c.x},${c.z}`, paint?.color ?? floorInside)
  }
  const rooms = new Map<string, ReactNode[]>()
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
    node: (
      <>
        {[...rooms].map(([color, list]) => (
          <g key={color} fill={color}>
            {list}
          </g>
        ))}
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
