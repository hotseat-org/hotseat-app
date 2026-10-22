import { AlertDialog, Button, Kbd, Popover } from "@heroui/react"
import {
  Check,
  CloudOff,
  CloudUpload,
  Info,
  LayoutGrid,
  Redo2,
  Ruler,
  Trash2,
  Undo2,
} from "lucide-react"
import clsx from "clsx"
import { useEditorStore } from "../store"
import { isMarker } from "../types"

const SHORTCUTS: [string, string][] = [
  ["1 – 9, 0", "Pick a tool / Erase"],
  ["Drag", "Draw a wall run"],
  ["Click wall", "Add a door"],
  ["Click", "Place / select"],
  ["R", "Rotate 90°"],
  ["M", "Measuring hints on / off"],
  ["Del / ⌫", "Delete selected"],
  ["Esc", "Deselect"],
  ["⌘Z / ⇧⌘Z", "Undo / redo"],
  ["F", "Fit to office"],
  ["⇧ Paint", "Paint one wall segment"],
  ["⇧ Click / drag box", "Multi-select"],
  ["← ↑ → ↓", "Nudge selection"],
  ["⌘C / ⌘V / ⌘D", "Copy / paste / duplicate"],
]

interface Props {
  /** True when the editor is backed by the office DB rather than localStorage. */
  dbMode?: boolean
  /** True while a DB save is in flight. */
  saving?: boolean
  /** The last DB save failed. */
  saveFailed?: boolean
  onRetrySave?: () => void
}

export const TopBar = ({ dbMode, saving, saveFailed, onRetrySave }: Props) => {
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const undo = useEditorStore((s) => s.undo)
  const measureHints = useEditorStore((s) => s.measureHints)
  const toggleMeasureHints = useEditorStore((s) => s.toggleMeasureHints)
  const redo = useEditorStore((s) => s.redo)
  const count = useEditorStore((s) => s.objects.filter((o) => !isMarker(o.type)).length)
  const clear = useEditorStore((s) => s.clear)

  return (
    <>
      <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-border bg-overlay/90 px-4 py-2.5 text-foreground shadow-overlay backdrop-blur-md">
        <LayoutGrid className="size-5 text-accent" />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Office Editor</p>
          {dbMode && saveFailed && !saving ? (
            <p className="flex items-center gap-1 text-xs text-danger">
              <CloudOff className="size-3" /> Couldn&apos;t save ·{" "}
              <button
                type="button"
                onClick={onRetrySave}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                Retry
              </button>
            </p>
          ) : dbMode ? (
            <p className="flex items-center gap-1 text-xs text-success">
              {saving ? (
                <>
                  <CloudUpload className="size-3 animate-pulse" /> Saving…
                </>
              ) : (
                <>
                  <Check className="size-3" /> Saved · {count} item{count === 1 ? "" : "s"}
                </>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-success">
              <Check className="size-3" /> Auto-saved · {count} item{count === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
        {/* Undo / redo — also ⌘Z / ⇧⌘Z. */}
        <div className="flex overflow-hidden rounded-xl border border-border bg-overlay/90 shadow-overlay backdrop-blur-md">
          <HistoryButton label="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
            <Undo2 className="size-5" />
          </HistoryButton>
          <HistoryButton label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}>
            <Redo2 className="size-5" />
          </HistoryButton>
        </div>

        {/* Measuring hints (gaps + alignment guides while placing) — also M. */}
        <button
          type="button"
          aria-pressed={measureHints}
          aria-label="Measuring hints (M)"
          title={measureHints ? "Measuring hints on (M)" : "Measuring hints off (M)"}
          onClick={toggleMeasureHints}
          className={clsx(
            "flex size-10 items-center justify-center rounded-xl border shadow-overlay backdrop-blur-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
            measureHints
              ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent/25"
              : "border-border bg-overlay/90 text-muted hover:bg-surface-secondary hover:text-foreground"
          )}
        >
          <Ruler className="size-5" />
        </button>

        {/* Shortcuts — a real Popover (focus-managed, dismissable) with Kbd keycaps. */}
        <Popover>
          <Popover.Trigger>
            <span
              className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-overlay/90 text-muted shadow-overlay backdrop-blur-md outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
              title="Shortcuts"
            >
              <Info className="size-5" />
            </span>
          </Popover.Trigger>
          <Popover.Content placement="bottom end" className="w-64">
            <Popover.Dialog className="outline-none">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Shortcuts
              </h4>
              <dl className="flex flex-col gap-1.5 text-sm">
                {SHORTCUTS.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{v}</dt>
                    <dd>
                      <Kbd>{k}</Kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </Popover.Dialog>
          </Popover.Content>
        </Popover>

        {/* Clear — confirm through an accessible AlertDialog instead of window.confirm. */}
        {count === 0 ? (
          <span
            className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-border bg-overlay/60 px-3 py-2.5 text-sm text-muted shadow-overlay backdrop-blur-md"
            title="Nothing to clear"
          >
            <Trash2 className="size-4" />
            Clear
          </span>
        ) : (
          <AlertDialog>
            <AlertDialog.Trigger>
              <span
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-overlay/90 px-3 py-2.5 text-sm text-danger shadow-overlay backdrop-blur-md outline-none transition-colors hover:bg-[color-mix(in_oklab,var(--danger)_15%,var(--overlay))] focus-visible:ring-2 focus-visible:ring-focus"
                title="Clear all"
              >
                <Trash2 className="size-4" />
                Clear
              </span>
            </AlertDialog.Trigger>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  {({ close }: { close: () => void }) => (
                    <>
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>Clear the whole office?</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        This removes all {count} item{count === 1 ? "" : "s"}. This can’t be undone.
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button variant="tertiary" onPress={close}>
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          onPress={() => {
                            clear()
                            close()
                          }}
                        >
                          Clear office
                        </Button>
                      </AlertDialog.Footer>
                    </>
                  )}
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        )}
      </div>
    </>
  )
}

/** A square undo/redo button (disabled state keeps its space — no jump). */
const HistoryButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="flex size-10 items-center justify-center text-muted transition-colors hover:bg-surface-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
  >
    {children}
  </button>
)
