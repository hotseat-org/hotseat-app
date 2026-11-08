import { Html } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import type { OrthographicCamera } from "three"
import clsx from "clsx"
import { Pin } from "lucide-react"
import { heatBarTop } from "../heatmap/heatmap"
import { deskName, useDeskFilter, useDesksOnDay } from "../booking/useBooking"
import { useOfficeStore, useOfficeStoreApi } from "../store"
import { useKeptFor, useTeammateColors } from "../teams"
import { useHoveredPieceActions } from "./useHoveredPiece"
import { getDeskTagTone } from "./deskTagTone"
import { getTagDetail, type TagDetail } from "./tagDetail"
import { personByEmail, usePeople } from "./people"
import { SeatAvatar } from "./SeatAvatar"
import { CURSORS } from "~/editor"
import { TeamDot } from "~/components/teams/teamLook"
import { getTeamHex } from "~/utils/teams"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * Keeps the store's tag detail in step with the camera's zoom: written only
 * when the level changes, so tags re-render at a threshold, not every frame.
 */
const TagDetailTracker = () => {
  const store = useOfficeStoreApi()

  useFrame(({ camera, size }) => {
    const orthographic = camera as OrthographicCamera
    const pixelsPerMetre =
      (orthographic.zoom * size.height) / Math.max(1e-6, orthographic.top - orthographic.bottom)
    const { tagDetail, setTagDetail } = store.getState()
    const next = getTagDetail(pixelsPerMetre, tagDetail)
    if (next !== tagDetail) setTagDetail(next)
  })

  return null
}

/** A tag's size at each level: a booked desk's face (px), and whether its name and number show. */
const LOOK: Record<TagDetail, { face: number; hasName: boolean; hasLabel: boolean }> = {
  far: { face: 22, hasName: false, hasLabel: false },
  middle: { face: 30, hasName: true, hasLabel: false },
  close: { face: 40, hasName: true, hasLabel: true },
}

/**
 * View mode: a floating tag over every desk for the shown day: who sits there
 * (their avatar, as on the plan, over a name pill — a pin marks a permanent
 * resident, you're highlighted), or "Free" when it can still be booked. Without booking (standalone) only labelled or
 * resident desks get a tag.
 */
export const SeatTags = () => {
  // Bridged into the canvas; the tags' text is made here, outside <Html>'s own root.
  const { t } = useI18n()
  const people = usePeople()
  const teammateColors = useTeammateColors()
  const getKeptFor = useKeptFor()
  const day = useOfficeStore((state) => state.booking.day)
  const tagDetail = useOfficeStore((state) => state.tagDetail)
  const spotlitId = useOfficeStore((state) => state.spotlight?.id)
  const { floorDesks: desks } = useDesksOnDay()
  const matchesFilter = useDeskFilter()
  const booking = useOfficeStore((state) => state.booking.enabled)
  const past = useOfficeStore((state) => state.booking.day < state.booking.today)
  // The open desk's card replaces its tag; pressed, a tag opens its desk's card.
  const openId = useOfficeStore((state) => state.seatCard?.id)
  const openSeatCard = useOfficeStore((state) => state.openSeatCard)
  const hoveredId = useOfficeStore((state) => state.hoveredPieceId)
  const { setHoveredPiece, clearHoveredPiece } = useHoveredPieceActions("tag")
  // The tags lie over the canvas: the scene lets go of what it had pointed at.
  const leaveScene = useThree((state) => state.events.handlers?.onPointerLeave)
  const i18n = useI18n()
  // Insights' heatmap: every desk's share of days in use, instead of who's in.
  const heatmap = useOfficeStore((state) => state.heatmap)
  if (heatmap)
    return (
      <>
        {desks.map(({ desk }) =>
          desk.id in heatmap.ratios ? (
            <Html
              key={desk.id}
              position={[desk.x, heatBarTop(heatmap.ratios[desk.id]) + 0.22, desk.z]}
              center
              zIndexRange={[20, 0]}
            >
              {/* Just the share (many desks, close together); the desk on hover. */}
              <div className="group flex cursor-default select-none items-center gap-1 whitespace-nowrap rounded-full border border-foreground/20 bg-overlay/95 px-1.5 text-[10px] font-extrabold leading-4 text-foreground shadow-overlay hover:relative hover:z-10 hover:text-[11px]">
                {desk.label && (
                  <span className="hidden opacity-70 group-hover:inline">{desk.label}</span>
                )}
                <span>{Math.round(heatmap.ratios[desk.id] * 100)}%</span>
              </div>
            </Html>
          ) : null
        )}
      </>
    )

  return (
    <>
      <TagDetailTracker />
      {desks.map(({ desk, state }) => {
        if (desk.id === openId) return null

        const person = state.kind === "free" ? null : personByEmail(people, state.email)
        const isBookable = state.kind === "free" && booking && !past
        // Its zone kept for a team you're not in: its name, not "Free".
        const keptFor = isBookable ? getKeptFor(desk.zone, day) : null
        const free = isBookable && !keptFor
        // Filtered out: a free desk gets no tag (its taker still shows).
        if (free && !matchesFilter(desk)) return null
        if (!person && !free && !keptFor && !desk.label) return null

        const mine = !!person && person.email === people.me?.email
        // What you're after shows in full at any distance: your desk, the desk
        // pointed at or looked for. Teammates, at least a face and a name.
        const isFocused = mine || desk.id === hoveredId || desk.id === spotlitId
        const isTeammate = !!person && teammateColors.has(person.email)
        const getDetail = (): TagDetail => {
          if (isFocused) return "close"
          if (isTeammate && tagDetail === "far") return "middle"

          return tagDetail
        }
        const detail = getDetail()
        const look = LOOK[detail]
        // Further out, a desk with nothing but its number shows nothing.
        if (detail !== "close" && !person && !free && !keptFor) return null

        // Further out, a free desk (or one kept for a team) is a dot; a booked one, just a face.
        const isDot = !person && (detail === "far" || (detail === "middle" && free))
        const hasPill = !isDot && (!person || look.hasName)

        return (
          <Html
            key={desk.id}
            // Booked: higher, so the avatar floats over whoever sits there.
            position={[desk.x, person ? 1.75 : 1.45, desk.z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            {/* Pressed like its desk: opens its card (to book it, see who's there). */}
            <button
              type="button"
              aria-label={t("Open {desk}", { desk: deskName(i18n, desk) })}
              // Kept from the scene beneath (its pointer moves and clicks):
              // it'd point at, and open, whatever piece is behind the tag.
              onClick={(event) => {
                event.stopPropagation()
                openSeatCard(desk.id)
              }}
              // A drag passing over it (the camera's) isn't stopped, nor does
              // it point at anything: the camera follows it on the document.
              onPointerMove={(event) => {
                if (event.buttons === 0) event.stopPropagation()
              }}
              // Pointed at, its desk shows it's pointed at too (its plinth).
              onPointerEnter={(event) => {
                if (event.buttons !== 0) return

                leaveScene?.(event.nativeEvent)
                setHoveredPiece(desk.id)
              }}
              onPointerLeave={() => clearHoveredPiece(desk.id)}
              // The button itself isn't scaled (the UI kit sets buttons' scale): what's in it is.
              // At least 24px to hit, even round a small dot (centred: the tag doesn't move).
              className="group pointer-events-auto grid min-h-6 min-w-6 place-items-center select-none"
              // The scene's own hand, as over its desk.
              style={{ cursor: CURSORS.point }}
            >
              <span
                className={clsx(
                  "flex origin-bottom flex-col items-center gap-1 transition-transform duration-150 group-hover:[transform:scale(1.1)]",
                  // Its desk pointed at: it grows too.
                  desk.id === hoveredId && "[transform:scale(1.1)]"
                )}
              >
                {person && state.kind !== "free" && (
                  <SeatAvatar
                    person={person}
                    email={state.email}
                    isMine={mine}
                    teamColor={teammateColors.get(state.email)}
                    size={look.face}
                  />
                )}
                {isDot && (
                  <span
                    aria-hidden
                    className={clsx(
                      "block rounded-full border-2 border-overlay shadow-overlay",
                      detail === "far" ? "size-3" : "size-4",
                      free && "bg-success"
                    )}
                    style={keptFor ? { background: getTeamHex(keptFor.color) } : undefined}
                  />
                )}
                {hasPill && (
                  <div
                    className={clsx(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-overlay",
                      getDeskTagTone(mine, free)
                    )}
                  >
                    {look.hasLabel && desk.label && (
                      <span className="opacity-80">{desk.label}</span>
                    )}
                    {/* First name only: neighbouring desks' tags would collide. */}
                    {person && <span>{mine ? t("You") : person.name.split(" ")[0]}</span>}
                    {look.hasLabel && state.kind === "resident" && (
                      <Pin className="size-3 opacity-70" aria-label={t("Permanent desk")} />
                    )}
                    {free && <span>{t("Free")}</span>}
                    {keptFor && (
                      <span className="flex items-center gap-1">
                        <TeamDot color={keptFor.color} className="size-2" />
                        {keptFor.name}
                      </span>
                    )}
                  </div>
                )}
              </span>
            </button>
          </Html>
        )
      })}
    </>
  )
}
