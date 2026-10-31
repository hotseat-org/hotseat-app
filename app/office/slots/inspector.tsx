import { Button } from "@heroui/react"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { ArrowRightLeft } from "lucide-react"
import { isRetiredDesk, isSeatable } from "../catalog"
import { usePeople } from "../desks/people"
import { getZones } from "../zones/zones"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { useOfficeStore } from "../store"
import { type InspectorSectionProps } from "~/editor"
import type { Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The office's part of the Inspector: an older layout's desk offers to become
 * the bookable one; desks get their zone, and a single desk its label,
 * features and resident.
 */
export const OfficeInspectorSection = ({ selected, count }: InspectorSectionProps) => (
  <>
    {count === 1 && isRetiredDesk(selected.type) && (
      <RetiredDeskNote id={selected.id} type={selected.type} />
    )}
    <ZoneSection />
    {count === 1 && isSeatable(selected.type) && <SeatSection key={selected.id} id={selected.id} />}
  </>
)

/**
 * Desk seat: its label, and its permanent resident (members only in a real
 * office). A resident desk is theirs every day and can't be booked.
 */
const SeatSection = ({ id }: { id: string }) => {
  const seat = useOfficeStore((state) => state.objects.find((object) => object.id === id))
  const setSeatLabel = useOfficeStore((state) => state.setSeatLabel)
  const assignSeat = useOfficeStore((state) => state.assignSeat)
  const numberDesks = useOfficeStore((state) => state.numberDesks)
  const toggleDeskFeature = useOfficeStore((state) => state.toggleDeskFeature)
  const people = usePeople()
  const { t, format } = useI18n()
  // Upcoming bookings on this desk: giving it a resident (or deleting it)
  // cancels them — said before it happens, not after.
  const byDay = useOfficeStore((state) => state.booking.byDay)
  const today = useOfficeStore((state) => state.booking.today)
  const isBookingOn = useOfficeStore((state) => state.booking.enabled)
  const bookings = useMemo(
    () =>
      isBookingOn
        ? Object.entries(byDay)
            .filter(([date, desks]) => date >= today && desks[id])
            .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
            .map(([date, desks]) => ({ day: date as Day, email: desks[id] }))
        : [],
    [isBookingOn, byDay, today, id]
  )
  /** A resident picked whose assignment would cancel someone's bookings: confirm first. */
  const [pendingResident, setPendingResident] = useState<string | null>(null)
  const nameOf = (email: string) =>
    people.members.find((member) => member.email === email)?.name ?? email
  const lostTo = (resident: string) => bookings.filter((booking) => booking.email !== resident)
  /** The new resident's own upcoming bookings in this office (any desk): they go too. */
  const ownDays = (resident: string) =>
    isBookingOn
      ? Object.entries(byDay)
          .filter(([date, desks]) => date >= today && Object.values(desks).includes(resident))
          .map(([date]) => date as Day)
          .sort()
      : []
  const cancels = (resident: string) =>
    [
      lostTo(resident).length ? describe(lostTo(resident)) : null,
      ownDays(resident).length
        ? t("{name}'s own bookings ({days})", {
            name: nameOf(resident),
            days: ownDays(resident).map(format.short).join(", "),
          })
        : null,
    ]
      .filter(Boolean)
      .join(t(" and "))
  const describe = (list: typeof bookings) =>
    list.map((booking) => `${nameOf(booking.email)} (${format.short(booking.day)})`).join(", ")
  if (!seat) return null

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{t("Seat")}</p>
        <button
          type="button"
          onClick={numberDesks}
          className="text-[11px] font-semibold text-accent hover:underline"
          title={t("Label every unlabelled desk D-1, D-2…")}
        >
          {t("Number all desks")}
        </button>
      </div>
      <input
        // Keyed by desk so switching selection resets the draft.
        key={seat.id}
        defaultValue={seat.label ?? ""}
        placeholder={t("Label, e.g. D-12")}
        maxLength={24}
        onBlur={(event) => setSeatLabel(seat.id, event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      {/* What it offers — people can filter the map by these. */}
      <p className="mt-1 text-xs font-medium text-muted">{t("Features")}</p>
      <div className="flex flex-wrap gap-1.5">
        {DESK_FEATURES.map((feature) => {
          const isActive = !!seat.features?.includes(feature.id)

          return (
            <button
              key={feature.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleDeskFeature(seat.id, feature.id)}
              className={clsx(
                "h-7 rounded-full border px-2.5 text-xs font-bold transition-colors",
                isActive
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-muted hover:text-foreground"
              )}
            >
              {t(feature.label)}
            </button>
          )
        })}
      </div>
      {people.members.length > 0 && (
        <>
          <label htmlFor={`resident-${seat.id}`} className="mt-1 text-xs font-medium text-muted">
            {t("Permanent resident")}
          </label>
          <select
            id={`resident-${seat.id}`}
            value={seat.assignee ?? ""}
            onChange={(event) => {
              const email = event.currentTarget.value || null
              if (email && (lostTo(email).length > 0 || ownDays(email).length > 0))
                setPendingResident(email)
              else assignSeat(seat.id, email)
            }}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="">{t("None (anyone can book it)")}</option>
            {people.members.map((member) => (
              <option key={member.email} value={member.email}>
                {member.name}
              </option>
            ))}
          </select>
          {pendingResident ? (
            <div className="flex flex-col gap-2 rounded-lg bg-warning/15 px-2.5 py-2 text-xs text-foreground">
              <p>
                {t("Making {name} its resident cancels {bookings}.", {
                  name: nameOf(pendingResident),
                  bookings: cancels(pendingResident),
                })}
              </p>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPendingResident(null)}
                  className="rounded-md px-2 py-1 font-bold hover:bg-foreground/5"
                >
                  {t("Keep bookings")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    assignSeat(seat.id, pendingResident)
                    setPendingResident(null)
                  }}
                  className="rounded-md bg-warning px-2 py-1 font-bold text-warning-foreground"
                >
                  {t("Assign anyway")}
                </button>
              </div>
            </div>
          ) : (
            !seat.assignee &&
            bookings.length > 0 && (
              <p className="rounded-lg bg-foreground/5 px-2.5 py-2 text-xs text-muted">
                {t("Booked: {bookings}. Giving it a resident or deleting it cancels these.", {
                  bookings: describe(bookings),
                })}
              </p>
            )
          )}
        </>
      )}
    </div>
  )
}

/**
 * An older layout's desk that can't be placed any more: why, and a one-click
 * switch to the bookable desk with its chair (bookings and details stay).
 */
const RetiredDeskNote = ({ id, type }: { id: string; type: string }) => {
  const { t } = useI18n()
  const replaceWithWorkstation = useOfficeStore((state) => state.replaceWithWorkstation)

  return (
    <div className="mb-4 rounded-xl bg-warning/10 p-3 text-xs leading-snug text-foreground">
      <p>
        {type === "deskmate"
          ? t("Its pet sits there whoever books it — pets now show only who's booked a desk.")
          : t("A desk without its chair: people book a seat, so desks now come with one.")}
      </p>
      <Button
        size="sm"
        fullWidth
        variant="secondary"
        className="mt-2"
        onPress={() => replaceWithWorkstation(id)}
      >
        <ArrowRightLeft className="size-4" />
        {t("Switch to desk with chair")}
      </Button>
    </div>
  )
}

/**
 * The selected desks' zone (team neighbourhood): pick one of the office's
 * zones, start a new one by name, or take them out. Zones colour their part
 * of the floor and can number their desks (ENG-1…).
 */
const ZoneSection = () => {
  const { t, tn } = useI18n()
  const objects = useOfficeStore((state) => state.objects)
  const selection = useOfficeStore((state) => state.selection)
  const setZone = useOfficeStore((state) => state.setZone)
  const numberDesksByZone = useOfficeStore((state) => state.numberDesksByZone)
  const zones = useMemo(() => getZones(objects), [objects])
  const desks = useMemo(() => {
    const ids = new Set(selection)

    return objects.filter((object) => ids.has(object.id) && isSeatable(object.type))
  }, [objects, selection])
  const [draft, setDraft] = useState("")
  if (desks.length === 0) return null

  const ids = desks.map((desk) => desk.id)
  const zoneNames = new Set(desks.map((desk) => desk.zone ?? ""))
  const current = zoneNames.size === 1 ? [...zoneNames][0] : null

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">
          {desks.length > 1 ? tn(desks.length, "Zone of {n} desk", "Zone of {n} desks") : t("Zone")}
        </p>
        {zones.length > 0 && (
          <button
            type="button"
            onClick={numberDesksByZone}
            className="text-[11px] font-semibold text-accent hover:underline"
            title={t("Number every desk after its zone: ENG-1, ENG-2… (the rest D-1…)")}
          >
            {t("Number by zone")}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {zones.map((zone) => {
          const isOn = current === zone.name

          return (
            <button
              key={zone.name}
              type="button"
              aria-pressed={isOn}
              onClick={() => setZone(ids, isOn ? null : zone.name)}
              className={clsx(
                "flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition-colors",
                isOn
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border text-muted hover:border-muted hover:text-foreground"
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: zone.color }} />
              <span className="truncate">{zone.name}</span>
            </button>
          )
        })}
      </div>
      <input
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !draft.trim()) return

          setZone(ids, draft)
          setDraft("")
        }}
        placeholder={zones.length ? t("New zone, e.g. Marketing") : t("Zone, e.g. Marketing")}
        aria-label={t("New zone")}
        maxLength={32}
        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
    </div>
  )
}
