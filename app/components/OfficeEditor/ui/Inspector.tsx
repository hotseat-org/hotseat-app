import { Button, ButtonGroup, CloseButton, ColorSwatchPicker } from "@heroui/react"
import { Copy, Dices, RotateCw, Trash2 } from "lucide-react"
import { useEditorStore } from "../store"
import { SWATCHES, DEFAULT_COLOR } from "../palette"
import { hasLooks, isEdgeType, isSeatable, isWallMounted } from "../types"
import { usePeople } from "../people"
import { TOOLS } from "./tools"

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

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 w-64 rounded-2xl border border-border bg-overlay/90 p-4 text-foreground shadow-overlay backdrop-blur-md">
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
        className="mb-4 grid grid-cols-5 gap-1.5"
      >
        {SWATCHES.map((c) => (
          <ColorSwatchPicker.Item key={c} color={c}>
            <ColorSwatchPicker.Swatch className="size-8 rounded-lg" />
            <ColorSwatchPicker.Indicator />
          </ColorSwatchPicker.Item>
        ))}
      </ColorSwatchPicker>

      {count === 1 && isSeatable(obj.type) && <SeatSection id={obj.id} />}

      <ButtonGroup fullWidth size="sm">
        {/* Wall items face out from their wall — nothing to rotate. */}
        {!edge && !isWallMounted(obj.type) && (
          <Button variant="tertiary" onPress={rotateSelection}>
            <RotateCw className="size-4" />
            Rotate
          </Button>
        )}
        {shufflable && (
          <Button
            variant="tertiary"
            onPress={() => shuffleLook(selection)}
            aria-label="Shuffle look"
          >
            <Dices className="size-4" />
            Look
          </Button>
        )}
        {!edge && (
          <Button variant="tertiary" onPress={duplicateSelection}>
            <Copy className="size-4" />
            Copy
          </Button>
        )}
        <Button variant="danger-soft" onPress={removeSelection}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </ButtonGroup>
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
  // Upcoming bookings on this desk — a resident means saving cancels them.
  const upcoming = useEditorStore((s) => {
    const { enabled, today, byDay } = s.booking
    if (!enabled) return 0
    return Object.entries(byDay).filter(([d, desks]) => d >= today && desks[id]).length
  })
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
            onChange={(e) => assignSeat(seat.id, e.currentTarget.value || null)}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="">None (anyone can book it)</option>
            {people.members.map((p) => (
              <option key={p.email} value={p.email}>
                {p.name}
              </option>
            ))}
          </select>
          {seat.assignee && upcoming > 0 && (
            <p className="rounded-lg bg-warning/15 px-2.5 py-2 text-xs text-foreground">
              This desk has bookings on {upcoming} upcoming {upcoming === 1 ? "day" : "days"}.
              They&apos;ll be cancelled when the layout saves.
            </p>
          )}
        </>
      )}
    </div>
  )
}
