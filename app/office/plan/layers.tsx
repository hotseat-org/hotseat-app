import clsx from "clsx"
import { useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { personByEmail, usePeople } from "../desks/people"
import { SeatCardBody, useSeatCard } from "../booking/seatCard"
import { deskName, useDeskFilter } from "../booking/useBooking"
import { useRoute } from "../wayfinding/wayfinding"
import { RoutePath } from "../wayfinding/RoutePath"
import { useOfficeStore } from "../store"
import { useHoveredPieceActions } from "../desks/useHoveredPiece"
import { useKeptFor, useTeammateColors } from "../teams"
import { getTagDetail, type TagDetail } from "../desks/tagDetail"
import { getZoneLabelStyle } from "../zones/zoneLabelStyle"
import { useRouteFraming, useSpotlight } from "./useFraming"
import {
  DeskTag,
  HeatTag,
  Occupant,
  RouteEnd,
  SpotlightRing,
  ZoneLetters,
  ZoneName,
} from "./overlays"
import { composeOccupants, usePlanDesks, usePlanZoneAreas } from "./drawings"
import { clamp } from "~/editor/core"
import { turnPoint } from "~/editor/kit"
import { type PlanLayerProps } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"

/** Name tags show once desks are big enough to tell apart. */
const TAG_ZOOM = 22
/** A booked desk's avatar on its chair: this wide in plan units, but never smaller on screen than… */
const AVATAR_SIZE = 0.8
/** …this (px) — so who sits where reads even with the whole office in view. */
const MIN_AVATAR_PX = 30
/** …or, far out, this (px) for someone who isn't yours to look for (see tagDetail). */
const FAR_AVATAR_PX = 18
/** …nor bigger than this (px), so close up it doesn't bury the desk. */
const MAX_AVATAR_PX = 56
/** The rings round a desk (the way's end, the spotlight): this much wider than its avatar (px). */
const RING_PAD = 14

/** The way to a desk, turned with the plan. */
const useTurnedRoute = (turn: number) => {
  const route = useRoute()
  const currentFloor = useOfficeStore((state) => state.currentFloor)
  // The shown floor's part of it (none when it doesn't pass here).
  const shownPoints = route?.path?.points.length ? route.path.points : undefined
  const points = useMemo(
    () => shownPoints?.map(([x, z]) => turnPoint(x, z, turn)),
    [shownPoints, turn]
  )

  // Framed again when asked for, and on each floor it's followed to.
  return { points, frameKey: shownPoints ? `${route?.nonce}:${currentFloor}` : null }
}

/** The way to a desk on the plan: its glowing line (an SVG layer, sized with the zoom). */
export const OfficeRoutePath = ({ plan }: PlanLayerProps) => {
  const { points } = useTurnedRoute(plan.turn)

  return points ? <RoutePath points={points} zoom={plan.view.zoom} /> : null
}

/**
 * The office over the plan (HTML, legible at any zoom): where the way ends,
 * the spotlit desk, who sits where, the heatmap's shares, zone names, desk
 * tags — and the open desk's card.
 */
export const OfficePlanOverlays = ({ plan }: PlanLayerProps) => {
  const i18n = useI18n()
  const { t } = i18n
  const { view, screen, turn, objects, isDark, phoneChrome } = plan
  const openSeatCard = useOfficeStore((state) => state.openSeatCard)
  const hoveredId = useOfficeStore((state) => state.hoveredPieceId)
  const { setHoveredPiece, clearHoveredPiece } = useHoveredPieceActions("tag")
  const heatmap = useOfficeStore((state) => state.heatmap)
  const isTagsLayerOn = useOfficeStore((state) => state.layers.deskTags)
  // Tags mark free desks as bookable whatever the heatmap (it hides them anyway).
  const bookable = useOfficeStore(
    (state) => state.booking.enabled && !(state.booking.day < state.booking.today)
  )
  const matchesFilter = useDeskFilter()
  const people = usePeople()
  const teammateColors = useTeammateColors()
  const getKeptFor = useKeptFor()
  const shownDay = useOfficeStore((state) => state.booking.day)
  const card = useSeatCard()
  const desks = usePlanDesks()
  const occupants = useMemo(() => composeOccupants(objects, desks), [objects, desks])
  const zoneAreas = usePlanZoneAreas(objects)

  /** Where a desk is: its occupant's chair, else the desk. */
  const findSpot = useCallback(
    (id: string) => occupants.get(id) ?? desks.find((entry) => entry.desk.id === id)?.desk,
    [occupants, desks]
  )
  const highlightId = useSpotlight({
    viewRef: plan.viewRef,
    frame: plan.frame,
    hasView: true,
    findSpot,
    glideTo: plan.glideTo,
  })
  const route = useTurnedRoute(turn)
  useRouteFraming({
    routePoints: route.points,
    routeKey: route.frameKey,
    hasView: true,
    viewRef: plan.viewRef,
    frame: plan.frame,
    glideTo: plan.glideTo,
  })

  const openId = card?.seat.id
  const avatarSize = clamp(AVATAR_SIZE * view.zoom, MIN_AVATAR_PX, MAX_AVATAR_PX)
  // How much tags show at this zoom (held at a threshold's edge, as in 3D).
  const detailRef = useRef<TagDetail>("middle")
  detailRef.current = getTagDetail(view.zoom, detailRef.current)
  const tagDetail = detailRef.current
  const zoneLabelStyle = useMemo(getZoneLabelStyle, [])
  /** Whether a desk is one to show in full: yours, a teammate's, looked for or pointed at. */
  const isFocused = (deskId: string, email?: string) =>
    deskId === highlightId ||
    deskId === hoveredId ||
    (!!email && (email === people.me?.email || teammateColors.has(email)))
  // The card's desk comes from the store, so it's turned here to match.
  const cardAt = card && turnPoint(card.seat.x, card.seat.z, turn)
  const highlighted = highlightId ? findSpot(highlightId) : undefined

  return (
    <>
      {route.points && (
        <RouteEnd
          size={avatarSize + RING_PAD}
          style={screen(...route.points[route.points.length - 1])}
        />
      )}

      {highlighted && (
        <SpotlightRing size={avatarSize + RING_PAD} style={screen(highlighted.x, highlighted.z)} />
      )}

      {/* Zones' names, under the faces (close up, the desks' own tags say enough). */}
      {zoneAreas.map(({ zone, label, floorLabel, edgeLabel }) => {
        if (zoneLabelStyle === "floor")
          return (
            <ZoneLetters
              key={zone.name}
              zone={zone}
              isAlongX={floorLabel.isAlongX}
              zoom={view.zoom}
              style={screen(floorLabel.x, floorLabel.z)}
            />
          )
        if (zoneLabelStyle === "edge")
          return <ZoneName key={zone.name} zone={zone} style={screen(edgeLabel.x, edgeLabel.z)} />

        return tagDetail === "close" ? null : (
          <ZoneName key={zone.name} zone={zone} style={screen(label.x, label.z)} />
        )
      })}

      {/* Who sits where — HTML, at least MIN_AVATAR_PX at any zoom. */}
      {!heatmap &&
        [...occupants.values()].map((occupant) =>
          occupant.id === openId ? null : (
            <Occupant
              key={occupant.id}
              person={personByEmail(people, occupant.email)}
              email={occupant.email}
              isMine={occupant.email === people.me?.email}
              teamColor={teammateColors.get(occupant.email)}
              // Far out, faces shrink — but not those you'd look for.
              size={
                tagDetail === "far" && !isFocused(occupant.id, occupant.email)
                  ? clamp(AVATAR_SIZE * view.zoom, FAR_AVATAR_PX, MIN_AVATAR_PX)
                  : avatarSize
              }
              style={screen(occupant.x, occupant.z)}
              onClick={(event) => {
                event.stopPropagation()
                if (!plan.isMoved()) openSeatCard(occupant.id)
              }}
            />
          )
        )}

      {/* Heatmap: every desk's share of days in use. */}
      {heatmap &&
        desks.map(({ desk }) =>
          desk.id in heatmap.ratios ? (
            <HeatTag
              key={desk.id}
              label={desk.label}
              ratio={heatmap.ratios[desk.id]}
              isDark={isDark}
              style={screen(desk.x, desk.z)}
            />
          ) : null
        )}

      {/* Name tags — HTML, so they stay legible at any zoom. */}
      {!heatmap &&
        isTagsLayerOn &&
        view.zoom >= TAG_ZOOM &&
        desks.map(({ desk, state }) => {
          if (desk.id === openId) return null

          const person = state.kind === "free" ? null : personByEmail(people, state.email)
          // Kept for a team you're not in: not free to you (its card says until when).
          const free = state.kind === "free" && bookable && !getKeptFor(desk.zone, shownDay)
          // Filtered out: no tag for a free desk (its taker still shows).
          if (free && !matchesFilter(desk)) return null
          // A free desk already shows its "+" ring: a tag only for its label.
          if (!person && !desk.label) return null

          const mine = !!person && person.email === people.me?.email
          // Desk numbers show close up only (or on a desk you'd look for).
          const isLabelShown = tagDetail === "close" || isFocused(desk.id, person?.email)
          if (!person && !isLabelShown) return null

          // A booked desk's tag sits just above its avatar.
          const occupant = occupants.get(desk.id)
          const at = occupant ? screen(occupant.x, occupant.z) : screen(desk.x, desk.z - 0.45)
          if (occupant) at.top -= avatarSize / 2 + 3

          return (
            // Pressed like its desk: opens its card (a pan ending on it doesn't).
            <button
              key={desk.id}
              type="button"
              aria-label={t("Open {desk}", { desk: deskName(i18n, desk) })}
              className="group absolute -translate-x-1/2 -translate-y-full cursor-pointer"
              style={at}
              onClick={(event) => {
                event.stopPropagation()
                if (!plan.isMoved()) openSeatCard(desk.id)
              }}
              onPointerEnter={() => setHoveredPiece(desk.id)}
              onPointerLeave={() => clearHoveredPiece(desk.id)}
            >
              {/* Pointed at — it, or its desk — it grows a little. */}
              <span
                className={clsx(
                  "block origin-bottom transition-transform duration-150 group-hover:[transform:scale(1.1)]",
                  desk.id === hoveredId && "[transform:scale(1.1)]"
                )}
              >
                <DeskTag
                  person={person}
                  label={isLabelShown ? desk.label : undefined}
                  mine={mine}
                  free={free}
                  resident={state.kind === "resident"}
                />
              </span>
            </button>
          )
        })}

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
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    card.body.onClose()
                  }}
                />
                <div className="relative">
                  <SeatCardBody key={card.key} layout="sheet" {...card.body} />
                </div>
              </div>,
              document.body
            )
          : cardAt && (
              <div className="absolute" style={screen(cardAt[0], cardAt[1])}>
                <SeatCardBody key={card.key} {...card.body} />
              </div>
            ))}
    </>
  )
}
