import { createPortal } from "react-dom"
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useRoute } from "../wayfinding"
import { useEditorStore } from "../store"
import { SURFACES } from "../palette"
import { personByEmail, usePeople } from "../people"
import { SeatCardBody, useSeatCard } from "../seatCard"
import { useDeskFilter, useDesksOnDay } from "../useBooking"
import { composeZoneAreas } from "../zones"
import { ContourLines } from "./ContourLines"
import { buildScene } from "./drawing/buildScene"
import {
  DeskTag,
  HeatTag,
  Occupant,
  PhoneControls,
  RouteEnd,
  SpotlightRing,
  ZoneName,
} from "./overlays"
import { fitView, turnObject, turnPoint, type Insets, type View } from "./planView"
import { RoutePath } from "./RoutePath"
import { useGlide, useRouteFraming, useSpotlight, type Frame } from "./useFraming"
import { usePlanGestures } from "./usePlanGestures"
import { useI18n } from "~/i18n/I18nProvider"

/** Room kept clear of the floating chrome when fitting (px). */
const FIT_PAD = { top: 96, bottom: 112, left: 112 }
/** Name tags show once desks are big enough to tell apart. */
const TAG_ZOOM = 22
/** A booked desk's avatar on its chair: this wide in plan units, but never smaller on screen than… */
const AVATAR_SIZE = 0.8
/** …this (px) — so who sits where reads even with the whole office in view. */
const MIN_AVATAR_PX = 30
/** …nor bigger than this (px), so close up it doesn't bury the desk. */
const MAX_AVATAR_PX = 56
/** The rings round a desk (the way's end, the spotlight): this much wider than its avatar (px). */
const RING_PAD = 14

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
  const layers = useEditorStore((s) => s.layers)
  const zoneClipId = useId()
  const people = usePeople()
  const card = useSeatCard()
  const surfaces = dark ? SURFACES.dark : SURFACES.light

  // View angle: the whole layout turned by quarter turns (see turnObject).
  const turn = useEditorStore((s) => s.planTurn)
  const turnBy = useEditorStore((s) => s.turnPlan)
  const objects = useMemo(() => layout.map((o) => turnObject(o, turn)), [layout, turn])
  const desks = useMemo(
    () => deskStates.map((d) => ({ ...d, desk: turnObject(d.desk, turn) })),
    [deskStates, turn]
  )
  const zoneAreas = useMemo(
    () => (layers.zones ? composeZoneAreas(objects) : []),
    [layers.zones, objects]
  )

  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [view, setView] = useState<View | null>(null)
  const { moved, onPointerDown } = usePlanGestures(box, setView, turnBy)

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
        zones: { areas: zoneAreas, isDark: dark, clipId: zoneClipId.replace(/:/g, "") },
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
      zoneAreas,
      zoneClipId,
      moved,
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
  const frame = useRef<Frame>({ size, bounds: scene.bounds, insets })
  frame.current = { size, bounds: scene.bounds, insets }
  const hasContent = !!scene.bounds
  const measured = size !== null
  useLayoutEffect(() => {
    const { size: s, bounds: b, insets: pad } = frame.current
    if (s && b) setView(fitView(b, s.w, s.h, pad))
  }, [fitNonce, hasContent, measured, turn])

  const viewRef = useRef(view)
  viewRef.current = view
  const hasView = view !== null
  const glideTo = useGlide(setView)
  /** Where a desk is: its occupant's chair, else the desk. */
  const findSpot = useCallback(
    (id: string) => scene.occupants.get(id) ?? desks.find((d) => d.desk.id === id)?.desk,
    [scene, desks]
  )
  const highlightId = useSpotlight({ viewRef, frame, hasView, findSpot, glideTo })

  // The way to a desk: the route, turned with the plan.
  const route = useRoute()
  const routeNonce = route?.path ? route.nonce : null
  const routePoints = useMemo(
    () => route?.path?.points.map(([x, z]) => turnPoint(x, z, turn)),
    [route?.path, turn]
  )
  useRouteFraming({ routePoints, routeNonce, hasView, viewRef, frame, glideTo })

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
  const highlighted = highlightId ? findSpot(highlightId) : undefined

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

      {view && routePoints && (
        <RouteEnd
          size={avatarSize + RING_PAD}
          style={screen(...routePoints[routePoints.length - 1])}
        />
      )}

      {view && highlighted && (
        <SpotlightRing size={avatarSize + RING_PAD} style={screen(highlighted.x, highlighted.z)} />
      )}

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

      {/* Heatmap: every desk's share of days in use. */}
      {view &&
        heatmap &&
        desks.map(({ desk }) =>
          desk.id in heatmap.ratios ? (
            <HeatTag
              key={desk.id}
              label={desk.label}
              ratio={heatmap.ratios[desk.id]}
              isDark={dark}
              style={screen(desk.x, desk.z)}
            />
          ) : null
        )}

      {view &&
        zoneAreas.map(({ zone, label }) => (
          <ZoneName key={zone.name} zone={zone} style={screen(label.x, label.z)} />
        ))}

      {/* Name tags — HTML, so they stay legible at any zoom. */}
      {view &&
        !heatmap &&
        layers.deskTags &&
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

      {phoneChrome && (
        <PhoneControls bottom={phoneChrome.bottom + 12} onTurn={turnBy} onFit={requestFit} />
      )}

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
