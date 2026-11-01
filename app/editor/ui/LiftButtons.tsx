import clsx from "clsx"
import { X } from "lucide-react"

/** A floor's button on a lift's panel. */
export interface LiftButton {
  id: string
  /** Its number ("0", "1"…), on the button. */
  number: number
  /** Its name, for the tooltip and screen readers. */
  name: string
  isShown: boolean
}

/**
 * A lift's floor buttons, like the panel inside one: round, the top floor's
 * first, the shown floor's lit — pressed, that floor is shown. Plain props
 * (no context): it's drawn into the 3D scene's own HTML layer too.
 */
export const LiftButtons = ({
  buttons,
  label,
  closeLabel,
  onPick,
  onClose,
}: {
  buttons: LiftButton[]
  label: string
  closeLabel: string
  onPick: (id: string) => void
  onClose: () => void
}) => (
  <div
    role="group"
    aria-label={label}
    className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-overlay p-2 text-foreground shadow-overlay"
    onPointerDown={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.key === "Escape" && onClose()}
  >
    <button
      type="button"
      aria-label={closeLabel}
      title={closeLabel}
      onClick={onClose}
      className="grid size-6 place-items-center rounded-full text-muted outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
    >
      <X className="size-3.5" />
    </button>
    {buttons.map((button) => (
      <button
        key={button.id}
        type="button"
        aria-pressed={button.isShown}
        aria-label={button.name}
        title={button.name}
        onClick={() => onPick(button.id)}
        className={clsx(
          "grid size-9 place-items-center rounded-full border-2 text-sm font-black tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
          button.isShown
            ? "border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
            : "border-border bg-surface text-muted hover:border-accent hover:text-foreground"
        )}
      >
        {button.number}
      </button>
    ))}
  </div>
)
