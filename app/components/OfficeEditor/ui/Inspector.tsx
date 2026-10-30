import { Button, CloseButton, ColorSwatchPicker } from "@heroui/react"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { ArrowRightLeft, Copy, Dices, RotateCw, Trash2 } from "lucide-react"
import { useEditorStore } from "../store"
import { SWATCHES } from "../palette"
import {
  DESK_FEATURES,
  hasLooks,
  isEdgeType,
  isRecolorable,
  isRetiredDesk,
  isSeatable,
  isWallMounted,
} from "../types"
import { usePeople } from "../people"
import { getZones } from "../zones"
import { getItem } from "../catalog/items"
import { TOOLS } from "./tools"
import type { Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"

const TYPE_LABEL = new Map<string, string>(TOOLS.map((meta) => [meta.tool, meta.label]))

export const Inspector = () => {
  const { t, tn } = useI18n()
  const selectedId = useEditorStore((state) => state.selectedId)
  const selected = useEditorStore(
    (state) => state.objects.find((object) => object.id === state.selectedId) ?? null
  )
  const count = useEditorStore((state) => state.selection.length)
  // Group actions work for a single piece too (a selection of one).
  const rotateSelection = useEditorStore((state) => state.rotateSelection)
  const colorSelection = useEditorStore((state) => state.colorSelection)
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection)
  const removeSelection = useEditorStore((state) => state.removeSelection)
  const select = useEditorStore((state) => state.select)
  const shuffleLook = useEditorStore((state) => state.shuffleLook)
  const selection = useEditorStore((state) => state.selection)
  // Retired desks aren't copied: a copy would place one anew.
  const hasRetiredDesk = useEditorStore((state) =>
    state.selection.some((id) => {
      const object = state.objects.find((candidate) => candidate.id === id)
      return !!object && isRetiredDesk(object.type)
    })
  )
  // Shuffle when every selected piece comes in several looks.
  const shufflable = useEditorStore((state) =>
    state.selection.every((id) => {
      const object = state.objects.find((candidate) => candidate.id === id)
      return !!object && hasLooks(object.type)
    })
  )

  // Doors are always wood: no colour to pick while one is selected.
  const canColor = useEditorStore((state) =>
    state.selection.every((id) => {
      const object = state.objects.find((candidate) => candidate.id === id)
      return !!object && isRecolorable(object.type)
    })
  )

  if (!selectedId || !selected) return null

  const current = selected.color ?? getItem(selected.type).defaultColor
  // Walls/doors sit on grid edges: they can't be turned or copied in place.
  const edge = isEdgeType(selected.type)

  const canRotate = !edge && !isWallMounted(selected.type)
  const canCopy = !edge && !hasRetiredDesk
  const otherActionCount = [canRotate, shufflable, canCopy].filter(Boolean).length

  return (
    <div className="pointer-events-auto w-64 rounded-2xl border border-border bg-overlay/90 p-4 text-foreground shadow-overlay backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {count > 1
            ? tn(count, "{n} item", "{n} items")
            : t(TYPE_LABEL.get(selected.type) ?? selected.type)}
        </h3>
        <CloseButton aria-label={t("Deselect")} onPress={() => select(null)} />
      </div>

      {canColor && (
        <>
          <p className="mb-1 text-xs font-medium text-muted">{t("Colour")}</p>
          <ColorSwatchPicker
            aria-label={t("Colour")}
            value={current}
            onChange={(color) => colorSelection(color.toString("hex").toLowerCase())}
            className="mb-4 grid grid-cols-5 justify-items-center gap-1.5"
          >
            {SWATCHES.map((color) => (
              // Size the item (its 2px ring included); the swatch fills it.
              <ColorSwatchPicker.Item key={color} color={color} className="size-9 rounded-xl">
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </>
      )}

      {count === 1 && isRetiredDesk(selected.type) && (
        <RetiredDeskNote id={selected.id} type={selected.type} />
      )}
      <ZoneSection />
      {count === 1 && isSeatable(selected.type) && (
        <SeatSection key={selected.id} id={selected.id} />
      )}

      {/* Two columns (four labelled buttons don't fit one row); Delete spans
          the row when it would be left on its own. */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Wall items face out from their wall — nothing to rotate. */}
        {canRotate && (
          <Button size="sm" fullWidth variant="tertiary" onPress={rotateSelection}>
            <RotateCw className="size-4" />
            {t("Rotate")}
          </Button>
        )}
        {shufflable && (
          <Button
            size="sm"
            fullWidth
            variant="tertiary"
            onPress={() => shuffleLook(selection)}
            aria-label={t("Shuffle look")}
          >
            <Dices className="size-4" />
            {t("Look")}
          </Button>
        )}
        {canCopy && (
          <Button size="sm" fullWidth variant="tertiary" onPress={duplicateSelection}>
            <Copy className="size-4" />
            {t("Copy")}
          </Button>
        )}
        <Button
          size="sm"
          fullWidth
          variant="danger-soft"
          onPress={removeSelection}
          className={clsx(otherActionCount % 2 === 0 && "col-span-2")}
        >
          <Trash2 className="size-4" />
          {t("Delete")}
        </Button>
      </div>
    </div>
  )
}

/**
 * Desk seat: its label, and its permanent resident (members only in a real
 * office). A resident desk is theirs every day and can't be booked.
 */
const SeatSection = ({ id }: { id: string }) => {
  const seat = useEditorStore((state) => state.objects.find((object) => object.id === id))
  const setSeatLabel = useEditorStore((state) => state.setSeatLabel)
  const assignSeat = useEditorStore((state) => state.assignSeat)
  const numberDesks = useEditorStore((state) => state.numberDesks)
  const toggleDeskFeature = useEditorStore((state) => state.toggleDeskFeature)
  const people = usePeople()
  const { t, format } = useI18n()
  // Upcoming bookings on this desk: giving it a resident (or deleting it)
  // cancels them — said before it happens, not after.
  const byDay = useEditorStore((state) => state.booking.byDay)
  const today = useEditorStore((state) => state.booking.today)
  const isBookingOn = useEditorStore((state) => state.booking.enabled)
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
  const replaceWithWorkstation = useEditorStore((state) => state.replaceWithWorkstation)
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
  const objects = useEditorStore((state) => state.objects)
  const selection = useEditorStore((state) => state.selection)
  const setZone = useEditorStore((state) => state.setZone)
  const numberDesksByZone = useEditorStore((state) => state.numberDesksByZone)
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
