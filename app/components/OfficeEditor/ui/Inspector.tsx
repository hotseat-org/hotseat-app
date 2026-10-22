import { Button, CloseButton, ColorSwatchPicker } from "@heroui/react"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { Copy, Dices, RotateCw, Trash2 } from "lucide-react"
import { useEditorStore } from "../store"
import { SWATCHES, DEFAULT_COLOR } from "../palette"
import { hasLooks, isEdgeType, isSeatable, isWallMounted } from "../types"
import { usePeople } from "../people"
import { TOOLS } from "./tools"
import { formatShort, type Day } from "~/utils/booking"

const TYPE_LABEL = new Map<string, string>(TOOLS.map((t) => [t.tool, t.label]))

export const Inspector = () => {
  const selectedId = useEditorStore((s) => s.selectedId)
  const obj = useEditorStore((s) => s.objects.find((o) => o.id === s.selectedId) ?? null)
  const count = useEditorStore((s) => s.selection.length)
  // Group actions work for a single piece too (a selection of one).
  const rotateSelection = useEditorStore((s) => s.rotateSelection)
  const colorSelection = useEditorStore((s) => s.colorSelection)
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection)
  const removeSelection = useEditorStore((s) => s.removeSelection)
  const select = useEditorStore((s) => s.select)
  const shuffleLook = useEditorStore((s) => s.shuffleLook)
  const selection = useEditorStore((s) => s.selection)
  // Shuffle when every selected piece comes in several looks.
  const shufflable = useEditorStore((s) =>
    s.selection.every((id) => {
      const o = s.objects.find((x) => x.id === id)
      return !!o && hasLooks(o.type)
    })
  )

  if (!selectedId || !obj) return null

  const current = obj.color ?? DEFAULT_COLOR[obj.type]
  // Walls/doors sit on grid edges: they can't be turned or copied in place.
  const edge = isEdgeType(obj.type)

  const canRotate = !edge && !isWallMounted(obj.type)
  const otherActionCount = [canRotate, shufflable, !edge].filter(Boolean).length

  return (
    <div className="pointer-events-auto w-64 rounded-2xl border border-border bg-overlay/90 p-4 text-foreground shadow-overlay backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {count > 1 ? `${count} items` : (TYPE_LABEL.get(obj.type) ?? obj.type)}
        </h3>
        <CloseButton aria-label="Deselect" onPress={() => select(null)} />
      </div>

      <p className="mb-1 text-xs font-medium text-muted">Colour</p>
      <ColorSwatchPicker
        aria-label="Colour"
        value={current}
        onChange={(c) => colorSelection(c.toString("hex").toLowerCase())}
        className="mb-4 grid grid-cols-5 justify-items-center gap-1.5"
      >
        {SWATCHES.map((c) => (
          // Size the item (its 2px ring included); the swatch fills it.
          <ColorSwatchPicker.Item key={c} color={c} className="size-9 rounded-xl">
            <ColorSwatchPicker.Swatch />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>

      {count === 1 && isSeatable(obj.type) && <SeatSection key={obj.id} id={obj.id} />}

      {/* Two columns (four labelled buttons don't fit one row); Delete spans
          the row when it would be left on its own. */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Wall items face out from their wall — nothing to rotate. */}
        {canRotate && (
          <Button size="sm" fullWidth variant="tertiary" onPress={rotateSelection}>
            <RotateCw className="size-4" />
            Rotate
          </Button>
        )}
        {shufflable && (
          <Button
            size="sm"
            fullWidth
            variant="tertiary"
            onPress={() => shuffleLook(selection)}
            aria-label="Shuffle look"
          >
            <Dices className="size-4" />
            Look
          </Button>
        )}
        {!edge && (
          <Button size="sm" fullWidth variant="tertiary" onPress={duplicateSelection}>
            <Copy className="size-4" />
            Copy
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
          Delete
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
  const seat = useEditorStore((s) => s.objects.find((o) => o.id === id))
  const setSeatLabel = useEditorStore((s) => s.setSeatLabel)
  const assignSeat = useEditorStore((s) => s.assignSeat)
  const numberDesks = useEditorStore((s) => s.numberDesks)
  const people = usePeople()
  // Upcoming bookings on this desk: giving it a resident (or deleting it)
  // cancels them — said before it happens, not after.
  const byDay = useEditorStore((s) => s.booking.byDay)
  const today = useEditorStore((s) => s.booking.today)
  const isBookingOn = useEditorStore((s) => s.booking.enabled)
  const bookings = useMemo(
    () =>
      isBookingOn
        ? Object.entries(byDay)
            .filter(([d, desks]) => d >= today && desks[id])
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([d, desks]) => ({ day: d as Day, email: desks[id] }))
        : [],
    [isBookingOn, byDay, today, id]
  )
  /** A resident picked whose assignment would cancel someone's bookings: confirm first. */
  const [pendingResident, setPendingResident] = useState<string | null>(null)
  const nameOf = (email: string) => people.members.find((p) => p.email === email)?.name ?? email
  const lostTo = (resident: string) => bookings.filter((b) => b.email !== resident)
  const describe = (list: typeof bookings) =>
    list.map((b) => `${nameOf(b.email)} (${formatShort(b.day)})`).join(", ")
  if (!seat) return null
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">Seat</p>
        <button
          type="button"
          onClick={numberDesks}
          className="text-[11px] font-semibold text-accent hover:underline"
          title="Label every unlabelled desk D-1, D-2…"
        >
          Number all desks
        </button>
      </div>
      <input
        // Keyed by desk so switching selection resets the draft.
        key={seat.id}
        defaultValue={seat.label ?? ""}
        placeholder="Label, e.g. D-12"
        maxLength={24}
        onBlur={(e) => setSeatLabel(seat.id, e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      {people.members.length > 0 && (
        <>
          <label htmlFor={`resident-${seat.id}`} className="mt-1 text-xs font-medium text-muted">
            Permanent resident
          </label>
          <select
            id={`resident-${seat.id}`}
            value={seat.assignee ?? ""}
            onChange={(e) => {
              const email = e.currentTarget.value || null
              if (email && lostTo(email).length > 0) setPendingResident(email)
              else assignSeat(seat.id, email)
            }}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="">None (anyone can book it)</option>
            {people.members.map((p) => (
              <option key={p.email} value={p.email}>
                {p.name}
              </option>
            ))}
          </select>
          {pendingResident ? (
            <div className="flex flex-col gap-2 rounded-lg bg-warning/15 px-2.5 py-2 text-xs text-foreground">
              <p>
                Making {nameOf(pendingResident)} its resident cancels{" "}
                {describe(lostTo(pendingResident))}.
              </p>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setPendingResident(null)}
                  className="rounded-md px-2 py-1 font-bold hover:bg-foreground/5"
                >
                  Keep bookings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    assignSeat(seat.id, pendingResident)
                    setPendingResident(null)
                  }}
                  className="rounded-md bg-warning px-2 py-1 font-bold text-warning-foreground"
                >
                  Assign anyway
                </button>
              </div>
            </div>
          ) : (
            !seat.assignee &&
            bookings.length > 0 && (
              <p className="rounded-lg bg-foreground/5 px-2.5 py-2 text-xs text-muted">
                Booked: {describe(bookings)}. Giving it a resident or deleting it cancels these.
              </p>
            )
          )}
        </>
      )}
    </div>
  )
}
