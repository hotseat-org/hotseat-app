import { Button } from "@heroui/react"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { ArrowRightLeft, UserRound } from "lucide-react"
import { isRetiredDesk, isSeatable } from "../catalog"
import { personByEmail, usePeople, type Person } from "../desks/people"
import { ResidentPicker } from "../desks/ResidentPicker"
import { SeatAvatar } from "../desks/SeatAvatar"
import { getZones } from "../zones/zones"
import {
  DEFAULT_NEON_COLOR,
  DEFAULT_SIGN_TEXT,
  MAX_SIGN_TEXT,
  NEON_TUBES,
} from "../catalog/neonSign"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { useOfficeStore } from "../store"
import { InspectorGroup, type InspectorSectionProps } from "~/editor"
import type { Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The office's part of the Inspector: an older layout's desk offers to become
 * the bookable one; a single desk gets its label, features and resident, and
 * desks their zone — each a group of its own.
 */
export const OfficeInspectorSection = ({ selected, count }: InspectorSectionProps) => (
  <>
    {count === 1 && isRetiredDesk(selected.type) && (
      <RetiredDeskNote id={selected.id} type={selected.type} />
    )}
    {count === 1 && isSeatable(selected.type) && <SeatSection key={selected.id} id={selected.id} />}
    {count === 1 && selected.type === "neonSign" && (
      <SignSection key={selected.id} id={selected.id} />
    )}
    <ZoneSection />
  </>
)

/** A neon sign's group: what it says, and its tubes' colour. */
const SignSection = ({ id }: { id: string }) => {
  const sign = useOfficeStore((state) => state.objects.find((object) => object.id === id))
  const setSignText = useOfficeStore((state) => state.setSignText)
  const setSignColor = useOfficeStore((state) => state.setSignColor)
  const { t } = useI18n()
  if (!sign) return null

  const current = sign.color ?? DEFAULT_NEON_COLOR

  return (
    <InspectorGroup title={t("Sign")}>
      <input
        // Saved when it loses focus (or on Enter): one undo step, not one per letter.
        defaultValue={sign.signText ?? ""}
        placeholder={DEFAULT_SIGN_TEXT}
        maxLength={MAX_SIGN_TEXT}
        onBlur={(event) => setSignText(sign.id, event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        aria-label={t("What the sign says")}
        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t("Neon colour")}>
        {NEON_TUBES.map(({ color, name }) => (
          <button
            key={color}
            type="button"
            aria-label={t(name)}
            title={t(name)}
            aria-pressed={color === current}
            onClick={() => setSignColor(sign.id, color)}
            className={clsx(
              "size-7 rounded-full border-2 transition-transform hover:scale-110",
              color === current ? "border-foreground" : "border-transparent"
            )}
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
        ))}
      </div>
    </InspectorGroup>
  )
}

/**
 * A desk's groups: its label, what it offers, and its permanent resident
 * (members only in a real office) — a resident desk is theirs every day and
 * can't be booked.
 */
const SeatSection = ({ id }: { id: string }) => {
  const seat = useOfficeStore((state) => state.objects.find((object) => object.id === id))
  const setSeatLabel = useOfficeStore((state) => state.setSeatLabel)
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
  const [isPickingResident, setIsPickingResident] = useState(false)
  const nameOf = (email: string) =>
    people.members.find((member) => member.email === email)?.name ?? email
  const describe = (list: typeof bookings) =>
    list.map((booking) => `${nameOf(booking.email)} (${format.short(booking.day)})`).join(", ")
  if (!seat) return null

  return (
    <>
      <InspectorGroup
        title={t("Seat")}
        action={
          <button
            type="button"
            onClick={numberDesks}
            className="shrink-0 text-[11px] font-semibold text-accent hover:underline"
            title={t("Label every unlabelled desk D-1, D-2…")}
          >
            {t("Number all desks")}
          </button>
        }
      >
        <input
          // Keyed by desk so switching selection resets the draft.
          key={seat.id}
          defaultValue={seat.label ?? ""}
          placeholder={t("Label, e.g. D-12")}
          maxLength={24}
          onBlur={(event) => setSeatLabel(seat.id, event.currentTarget.value)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          aria-label={t("Label")}
          className="h-8 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </InspectorGroup>
      {/* What it offers — people can filter the map by these. */}
      <InspectorGroup title={t("Features")}>
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
      </InspectorGroup>
      {people.members.length > 0 && (
        <InspectorGroup title={t("Permanent resident")}>
          <ResidentButton
            resident={personByEmail(people, seat.assignee)}
            email={seat.assignee}
            onPress={() => setIsPickingResident(true)}
          />
          {!seat.assignee && bookings.length > 0 && (
            <p className="rounded-lg bg-foreground/5 px-2.5 py-2 text-xs text-muted">
              {t("Booked: {bookings}. Giving it a resident or deleting it cancels these.", {
                bookings: describe(bookings),
              })}
            </p>
          )}
          {isPickingResident && (
            <ResidentPicker deskId={seat.id} onClose={() => setIsPickingResident(false)} />
          )}
        </InspectorGroup>
      )}
    </>
  )
}

/** The desk's resident (or none), opening the picker. */
const ResidentButton = ({
  resident,
  email,
  onPress,
}: {
  resident: Person | null
  email?: string
  onPress: () => void
}) => {
  const { t } = useI18n()

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex min-h-10 items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left outline-none transition-colors hover:border-muted focus-visible:ring-2 focus-visible:ring-focus"
    >
      {email ? (
        <SeatAvatar person={resident} email={email} isMine={false} size={26} />
      ) : (
        <span className="grid size-[26px] shrink-0 place-items-center rounded-full border border-dashed border-muted text-muted">
          <UserRound className="size-3.5" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm">
        {email ? (resident?.name ?? email) : t("None (anyone can book it)")}
      </span>
      <span className="shrink-0 text-[11px] font-semibold text-accent">
        {email ? t("Change") : t("Assign")}
      </span>
    </button>
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
    <div className="my-2.5 rounded-xl bg-warning/10 p-3 text-xs leading-snug text-foreground">
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
    <InspectorGroup
      title={
        desks.length > 1 ? tn(desks.length, "Zone of {n} desk", "Zone of {n} desks") : t("Zone")
      }
      action={
        zones.length > 0 && (
          <button
            type="button"
            onClick={numberDesksByZone}
            className="shrink-0 text-[11px] font-semibold text-accent hover:underline"
            title={t("Number every desk after its zone: ENG-1, ENG-2… (the rest D-1…)")}
          >
            {t("Number by zone")}
          </button>
        )
      }
    >
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
    </InspectorGroup>
  )
}
