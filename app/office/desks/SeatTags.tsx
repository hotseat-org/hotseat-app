import { Html } from "@react-three/drei"
import clsx from "clsx"
import { Pin } from "lucide-react"
import { heatBarTop } from "../heatmap/heatmap"
import { useDeskFilter, useDesksOnDay } from "../booking/useBooking"
import { useOfficeStore } from "../store"
import { getDeskTagTone } from "./deskTagTone"
import { personByEmail, usePeople } from "./people"
import { SeatAvatar } from "./SeatAvatar"
import { useI18n } from "~/i18n/I18nProvider"

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
  const { desks } = useDesksOnDay()
  const matchesFilter = useDeskFilter()
  const booking = useOfficeStore((state) => state.booking.enabled)
  const past = useOfficeStore((state) => state.booking.day < state.booking.today)
  // The open desk's card replaces its tag.
  const openId = useOfficeStore((state) => state.seatCard?.id)
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
              <div className="group flex cursor-default select-none items-center gap-1 whitespace-nowrap rounded-full border border-border bg-overlay/95 px-1.5 text-[10px] font-extrabold leading-4 text-foreground shadow-overlay hover:relative hover:z-10 hover:text-[11px]">
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
      {desks.map(({ desk, state }) => {
        if (desk.id === openId) return null

        const person = state.kind === "free" ? null : personByEmail(people, state.email)
        const free = state.kind === "free" && booking && !past
        // Filtered out: a free desk gets no tag (its taker still shows).
        if (free && !matchesFilter(desk)) return null
        if (!person && !free && !desk.label) return null

        const mine = !!person && person.email === people.me?.email

        return (
          <Html
            key={desk.id}
            // Booked: higher, so the avatar floats over whoever sits there.
            position={[desk.x, person ? 1.75 : 1.45, desk.z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="flex select-none flex-col items-center gap-1">
              {person && state.kind !== "free" && (
                <SeatAvatar person={person} email={state.email} isMine={mine} size={40} />
              )}
              <div
                className={clsx(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-overlay",
                  getDeskTagTone(mine, free)
                )}
              >
                {desk.label && <span className="opacity-80">{desk.label}</span>}
                {/* First name only: neighbouring desks' tags would collide. */}
                {person && <span>{mine ? t("You") : person.name.split(" ")[0]}</span>}
                {state.kind === "resident" && (
                  <Pin className="size-3 opacity-70" aria-label={t("Permanent desk")} />
                )}
                {free && <span>{t("Free")}</span>}
              </div>
            </div>
          </Html>
        )
      })}
    </>
  )
}
