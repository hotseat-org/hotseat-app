import { AlertDialog, Button, Kbd, Popover } from "@heroui/react"
import {
  Check,
  CloudOff,
  CloudUpload,
  Info,
  LayoutGrid,
  Redo2,
  Search,
  Trash2,
  Undo2,
} from "lucide-react"
import { useEditorStore } from "../../store"
import { isMarker } from "../../types"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

/** Keys (some with a word to translate) and what they do. */
const SHORTCUTS: [string, string][] = [
  ["1 – 9, 0", msg("Pick a tool / Erase")],
  [msg("Drag"), msg("Draw a wall run")],
  [msg("Click wall"), msg("Add a door")],
  [msg("Click"), msg("Place / select")],
  ["R", msg("Rotate 90°")],
  ["M", msg("Measuring hints on / off")],
  ["Del / ⌫", msg("Delete selected")],
  ["Esc", msg("Deselect")],
  ["⌘Z / ⇧⌘Z", msg("Undo / redo")],
  ["F", msg("Fit to office")],
  [msg("⇧ Paint"), msg("Paint the inside of the whole room")],
  [msg("⇧ Click / drag box"), msg("Multi-select")],
  ["← ↑ → ↓", msg("Nudge selection")],
  ["⌘C / ⌘V / ⌘D", msg("Copy / paste / duplicate")],
  ["⌘K", msg("Search commands")],
  [msg("Right-click"), msg("Menu for a piece or the floor")],
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

interface SaveStatusProps extends Props {
  count: number
}

/** The line under the title: where the layout is saved and how it went. */
const SaveStatus = ({ dbMode, saving, saveFailed, count, onRetrySave }: SaveStatusProps) => {
  const { t, tn } = useI18n()
  const itemCount = tn(count, "{n} item", "{n} items")

  if (dbMode && saveFailed && !saving)
    return (
      <p className="flex items-center gap-1 text-xs text-danger">
        <CloudOff className="size-3" /> {t("Couldn't save")} ·{" "}
        <button
          type="button"
          onClick={onRetrySave}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          {t("Retry")}
        </button>
      </p>
    )

  if (dbMode)
    return (
      <p className="flex items-center gap-1 text-xs text-success">
        {saving ? (
          <>
            <CloudUpload className="size-3 animate-pulse" /> {t("Saving…")}
          </>
        ) : (
          <>
            <Check className="size-3" /> {t("Saved")} · {itemCount}
          </>
        )}
      </p>
    )

  return (
    <p className="flex items-center gap-1 text-xs text-success">
      <Check className="size-3" /> {t("Auto-saved")} · {itemCount}
    </p>
  )
}

export const TopBar = ({ dbMode, saving, saveFailed, onRetrySave }: Props) => {
  const { t, tn } = useI18n()
  const setCommandSearchOpen = useEditorStore((state) => state.setCommandSearchOpen)
  const canUndo = useEditorStore((state) => state.past.length > 0)
  const canRedo = useEditorStore((state) => state.future.length > 0)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const count = useEditorStore(
    (state) => state.objects.filter((object) => !isMarker(object.type)).length
  )
  const clear = useEditorStore((state) => state.clear)
  // With floors, Clear empties the one shown.
  const hasFloors = useEditorStore((state) => state.floors.length > 1)

  return (
    <>
      <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-border bg-overlay px-4 py-2.5 text-foreground shadow-overlay">
        <LayoutGrid className="size-5 text-accent" />
        <div className="leading-tight">
          <p className="text-sm font-semibold">{t("Office Editor")}</p>
          <SaveStatus
            dbMode={dbMode}
            saving={saving}
            saveFailed={saveFailed}
            count={count}
            onRetrySave={onRetrySave}
          />
        </div>
      </div>

      <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
        {/* The command search — also ⌘K. */}
        <button
          type="button"
          data-tour="search"
          aria-label={t("Search commands (⌘K)")}
          title={t("Search commands (⌘K)")}
          onClick={() => setCommandSearchOpen(true)}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-overlay text-muted shadow-overlay outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Search className="size-5" />
        </button>

        {/* Undo / redo — also ⌘Z / ⇧⌘Z. */}
        <div className="flex overflow-hidden rounded-xl border border-border bg-overlay shadow-overlay">
          <HistoryButton label={t("Undo (⌘Z)")} disabled={!canUndo} onClick={undo}>
            <Undo2 className="size-5" />
          </HistoryButton>
          <span className="my-2 w-px bg-separator" aria-hidden />
          <HistoryButton label={t("Redo (⇧⌘Z)")} disabled={!canRedo} onClick={redo}>
            <Redo2 className="size-5" />
          </HistoryButton>
        </div>

        {/* Shortcuts — a real Popover (focus-managed, dismissable) with Kbd keycaps. */}
        <Popover>
          <Popover.Trigger>
            <span
              className="cursor-pointer flex size-10 items-center justify-center rounded-xl border border-border bg-overlay text-muted shadow-overlay outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
              title={t("Shortcuts")}
              aria-label={t("Shortcuts")}
            >
              <Info className="size-5" />
            </span>
          </Popover.Trigger>
          <Popover.Content placement="bottom end" className="w-64">
            <Popover.Dialog className="outline-none">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {t("Shortcuts")}
              </h4>
              <dl className="flex flex-col gap-1.5 text-sm">
                {SHORTCUTS.map(([shortcut, description]) => (
                  <div key={shortcut} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{t(description)}</dt>
                    <dd>
                      <Kbd>{t(shortcut)}</Kbd>
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
            className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-border bg-overlay px-3 py-2.5 text-sm text-muted shadow-overlay"
            title={t("Nothing to clear")}
          >
            <Trash2 className="size-4" />
            {t("Clear")}
          </span>
        ) : (
          <AlertDialog>
            <AlertDialog.Trigger>
              <span
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-overlay px-3 py-2.5 text-sm text-danger shadow-overlay outline-none transition-colors hover:bg-[color-mix(in_oklab,var(--danger)_15%,var(--overlay))] focus-visible:ring-2 focus-visible:ring-focus"
                title={t("Clear all")}
              >
                <Trash2 className="size-4" />
                {t("Clear")}
              </span>
            </AlertDialog.Trigger>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  {({ close }: { close: () => void }) => (
                    <>
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>
                          {hasFloors ? t("Clear this floor?") : t("Clear the whole office?")}
                        </AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        {tn(
                          count,
                          "This removes {n} item. This can't be undone.",
                          "This removes all {n} items. This can't be undone."
                        )}
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button variant="tertiary" onPress={close}>
                          {t("Cancel")}
                        </Button>
                        <Button
                          variant="danger"
                          onPress={() => {
                            clear()
                            close()
                          }}
                        >
                          {hasFloors ? t("Clear floor") : t("Clear office")}
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
