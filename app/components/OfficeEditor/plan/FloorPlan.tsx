import clsx from "clsx"
import { Pin } from "lucide-react"
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
import {
  edgeNodes,
  enclosedCells,
  enclosedRegions,
  footprintCells,
  runsAlongX,
  SEG,
  unitEdges,
} from "../layout"
import { SURFACES } from "../palette"
import { initials, personByEmail, usePeople, type People } from "../people"
import { spotFor } from "../seatSpot"
import { SeatCardBody, useSeatCard } from "../scene/SeatPopup"
import { useDesksOnDay, type DeskOnDay } from "../useBooking"
import { GRID, isEdgeType, isMarker, isSeatable, type SceneObject } from "../types"
import { WALL } from "../objects/dimensions"
import {
  boxNode,
  floorPolygon,
  project,
  screenBounds,
  sortBackToFront,
  type Drawable,
  type Extent,
} from "./iso"
import { buildKit, Kit, WINDOW_GLASS } from "./kits"

/** Screen pixels per plan unit: the zoom range. */
const MIN_K = 8
const MAX_K = 220
/** Room kept clear of the floating chrome when fitting (px). */
const FIT_PAD = { top: 96, bottom: 112, left: 112 }
/** Name tags show once desks are big enough to tell apart. */
const TAG_ZOOM = 22
/** A press that moves further than this is a pan, not a click (px). */
const DRAG = 4
/** Walls facing the viewer are cut down to this, so the rooms stay visible. */
const STUB = 0.22
/** A partition between two rooms: half height. */
const PARTITION = 0.75
/** Tags and the desk card hang this high above a desk. */
const TAG_Y = 1.55

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
 * Simple mode: the office as a light isometric illustration (SVG) — for
 * devices that struggle with the 3D scene, or have no WebGL at all. Same data
 * and booking as 3D: every piece drawn as a few shaded boxes, back walls up
 * and front walls cut down (so rooms stay visible), desks marked by who's in
 * on the shown day, and the same desk card on click. Drag to pan, scroll or
 * pinch to zoom; Fit (bottom bar) re-frames it.
 */
export const FloorPlan = ({
  dark,
  padRight = 40,
}: {
  dark: boolean
  /** Screen space the right-hand panels cover, kept clear when fitting (px). */
  padRight?: number
}) => {
  const objects = useEditorStore((s) => s.objects)
  const fitNonce = useEditorStore((s) => s.fitNonce)
  const openSeatCard = useEditorStore((s) => s.openSeatCard)
  const closeSeatCard = useEditorStore((s) => s.closeSeatCard)
  const bookingOn = useEditorStore((s) => s.booking.enabled)
  const past = useEditorStore((s) => s.booking.day < s.booking.today)
  const { desks } = useDesksOnDay()
  const people = usePeople()
  const card = useSeatCard()
  const surfaces = dark ? SURFACES.dark : SURFACES.light

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
  }, [fitNonce, hasContent, measured])

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

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
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
  const screen = (x: number, y: number, z: number) => {
    if (!view) return { left: 0, top: 0 }
    const [px, py] = project(x, y, z)
    return { left: px * view.k + view.tx, top: py * view.k + view.ty }
  }
  const openId = card?.seat.id

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
          if (!person && !free && !desk.label) return null
          const mine = !!person && person.email === people.me?.email
          return (
            <div
              key={desk.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
              style={screen(desk.x, TAG_Y, desk.z)}
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

      {card && view && (
        <div className="absolute" style={screen(card.seat.x, 1.3, card.seat.z)}>
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
    {free && <span>Free</span>}
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
 * Everything in plan units: the rooms' floor, desk footprints for the shown
 * day, then every wall and piece sorted back to front — and the drawing's
 * bounds (for fitting).
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
  const inside = new Set(enclosedCells(objects).map((c) => `${c.x},${c.z}`))
  const isInside = (x: number, z: number) =>
    inside.has(`${Math.floor(x / SEG) * SEG},${Math.floor(z / SEG) * SEG}`)
  const paints = objects.filter((o) => o.type === "floorPaint" && o.color)
  const byId = new Map(desks.map((d) => [d.desk.id, d]))
  const seats = objects.filter((o) => o.type === "seat")
  const me = people.me?.email

  const drawables: Drawable[] = []
  const push = (ext: Extent, node: ReactNode) =>
    drawables.push({ ext, node, order: drawables.length })

  // --- Walls: back walls of a room stand; walls facing the viewer are cut
  // down to a stub, partitions to half height.
  const heightOf = (o: SceneObject) => {
    const e = unitEdges(o)[0]
    const d = SEG / 2
    const [front, back] = runsAlongX(o.rotation)
      ? [isInside(e.x, e.z + d), isInside(e.x, e.z - d)]
      : [isInside(e.x + d, e.z), isInside(e.x - d, e.z)]
    return front ? (back ? PARTITION : WALL.height) : STUB
  }
  const t = WALL.depth / 2
  /**
   * A wall piece along its line from `from` to `to` (world coords along the
   * run; `fixed` across it). Drawn at full thickness with its ends overlapping
   * the neighbours by half a wall (so corners close); SORTED as its thin centre
   * line without the overlap — furniture standing flush against it, and the
   * next piece along the line, then order cleanly instead of by chance.
   */
  const wallPiece = (
    alongX: boolean,
    fixed: number,
    from: number,
    to: number,
    y0: number,
    y1: number,
    color: string,
    opacity = 1,
    extend = t
  ) => {
    const span = (lo: number, hi: number, across: number): Extent =>
      alongX
        ? { x0: lo, x1: hi, z0: fixed - across, z1: fixed + across, y0, y1 }
        : { x0: fixed - across, x1: fixed + across, z0: lo, z1: hi, y0, y1 }
    const draw = span(from - extend, to + extend, t)
    drawables.push({
      ext: draw,
      sort: span(from, to, 0.01),
      node: boxNode(draw, color, opacity),
      order: drawables.length,
    })
  }

  // Plain and glass walls merge into straight runs of the same height and
  // colour — one box per run, so no seams between half-metre segments.
  const runs = new Map<
    string,
    { alongX: boolean; fixed: number; at: number[]; h: number; color: string; glass: boolean }
  >()
  for (const o of objects) {
    if (o.type !== "wall" && o.type !== "glassWall") continue
    const alongX = runsAlongX(o.rotation)
    const glass = o.type === "glassWall"
    const h = heightOf(o)
    const color = glass ? WINDOW_GLASS : (o.color ?? wall)
    const fixed = alongX ? o.z : o.x
    const key = `${alongX}|${fixed}|${glass}|${color}|${h}`
    const run = runs.get(key) ?? { alongX, fixed, at: [], h, color, glass }
    run.at.push(alongX ? o.x : o.z)
    runs.set(key, run)
  }
  for (const r of runs.values()) {
    r.at.sort((p, q) => p - q)
    let start = r.at[0]
    let prev = r.at[0]
    const flush = () =>
      wallPiece(
        r.alongX,
        r.fixed,
        start - SEG / 2,
        prev + SEG / 2,
        0,
        r.h,
        r.color,
        r.glass ? 0.55 : 1
      )
    for (const v of r.at.slice(1)) {
      if (Math.abs(v - prev - SEG) > 1e-6) {
        flush()
        start = v
      }
      prev = v
    }
    flush()
  }

  // Windows and doors, cut into their wall's height.
  for (const o of objects) {
    if (o.type !== "window" && o.type !== "door" && o.type !== "glassDoor") continue
    const [a, b] = edgeNodes(o)
    const alongX = runsAlongX(o.rotation)
    const fixed = alongX ? a.z : a.x
    const [from, to] = alongX ? [a.x, b.x] : [a.z, b.z]
    const h = heightOf(o)
    if (o.type === "window") {
      wallPiece(alongX, fixed, from, to, 0, Math.min(h, 0.55), wall)
      if (h > 0.55) {
        wallPiece(alongX, fixed, from, to, 0.55, 1.2, WINDOW_GLASS, 0.5, 0)
        wallPiece(alongX, fixed, from, to, 1.2, h, wall)
      }
      continue
    }
    // Door / glass door: jambs (and a lintel in a standing wall), open
    // between. In a cut-down wall it's just the gap.
    if (h === STUB) continue
    const post = 0.12
    const frame = o.type === "glassDoor" ? "#5b6577" : wall
    wallPiece(alongX, fixed, from, from + post, 0, h, frame)
    wallPiece(alongX, fixed, to - post, to, 0, h, frame)
    if (h === WALL.height) wallPiece(alongX, fixed, from, to, 1.24, h, frame, 1, 0)
  }

  // --- Furniture, desks (clickable) and whoever sits at them.
  for (const o of objects) {
    if (isEdgeType(o.type) || isMarker(o.type)) continue
    const on = byId.get(o.id)
    if (!isSeatable(o.type)) {
      const k = new Kit(o)
      buildKit(k, o)
      drawables.push(...k.items.map((it) => ({ ...it, order: drawables.length })))
      continue
    }
    const taken = !!on && on.state.kind !== "free"
    const k = new Kit(o, (node) => (
      <g
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onDesk(o.id)
        }}
      >
        {node}
      </g>
    ))
    buildKit(k, o, { occupied: bookable || taken ? taken : undefined })
    drawables.push(...k.items.map((it) => ({ ...it, order: drawables.length })))
    if (on && on.state.kind !== "free") {
      const state = on.state
      const spot = spotFor(o, seats)
      const person = personByEmail(people, state.email)
      const mine = state.email === me
      const [px, py] = project(spot.x, 0.98, spot.z)
      push(
        {
          x0: spot.x - 0.2,
          x1: spot.x + 0.2,
          z0: spot.z - 0.2,
          z1: spot.z + 0.2,
          y0: 0.6,
          y1: 1.2,
        },
        <g
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onDesk(o.id)
          }}
        >
          <circle
            cx={px}
            cy={py}
            r={0.24}
            className={mine ? "fill-accent" : undefined}
            fill={mine ? undefined : "#ffffff"}
            stroke={mine ? "#ffffff" : "#4a5263"}
            strokeWidth={0.03}
          />
          <text
            x={px}
            y={py}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={0.19}
            fontWeight={800}
            fill={mine ? "#ffffff" : "#4a5263"}
          >
            {person ? initials(person.name) : "?"}
          </text>
        </g>
      )
    }
  }

  // Flat things (rugs) lie on the floor under everything: drawn with the
  // floor, not depth-sorted against what stands on them.
  const flat = drawables.filter((d) => d.ext.y1 <= 0.02)
  const sorted = sortBackToFront(drawables.filter((d) => d.ext.y1 > 0.02))

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
      list.push(floorPolygon(start, z, prev + SEG, z + SEG, 0, {}, `${z},${start}`))
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

  // Desk footprints for the shown day: free (dashed green) or yours (accent).
  const footprints: ReactNode[] = []
  for (const { desk, state } of desks) {
    const mine = state.kind !== "free" && state.email === me
    const free = state.kind === "free" && bookable
    if (!mine && !free) continue
    const [cx, cz] = footprintCells(desk.type, desk.rotation)
    const hx = (cx * GRID) / 2
    const hz = (cz * GRID) / 2
    footprints.push(
      floorPolygon(
        desk.x - hx,
        desk.z - hz,
        desk.x + hx,
        desk.z + hz,
        0.012,
        {
          className: mine ? "fill-accent/25 stroke-accent" : "fill-success/20 stroke-success",
          strokeWidth: mine ? 0.05 : 0.04,
          strokeDasharray: mine ? undefined : "0.12 0.08",
        },
        desk.id
      )
    )
  }

  let bounds: Bounds | null = null
  for (const d of drawables) {
    const b = screenBounds(d.ext)
    bounds = bounds
      ? {
          x0: Math.min(bounds.x0, b.x0),
          x1: Math.max(bounds.x1, b.x1),
          y0: Math.min(bounds.y0, b.y0),
          y1: Math.max(bounds.y1, b.y1),
        }
      : b
  }

  return {
    bounds,
    node: (
      <>
        {[...rooms].map(([color, list]) => (
          <g key={color} fill={color}>
            {list}
          </g>
        ))}
        {flat.map((d, i) => (
          <g key={`f${i}`}>{d.node}</g>
        ))}
        {footprints}
        {sorted.map((d, i) => (
          <g key={i}>{d.node}</g>
        ))}
      </>
    ),
  }
}
