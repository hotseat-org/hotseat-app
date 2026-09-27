import clsx from "clsx"
import { Building2, LayoutGrid, PencilRuler, Square } from "lucide-react"
import { useEditorStore } from "../store"
import { TEMPLATES, type OfficeTemplate } from "../templates"
import { EmptyState } from "~/components/ui/EmptyState"

interface Props {
  /** True in display mode — picking anything drops into edit mode first. */
  readOnly: boolean
  /** Switch the editor into edit mode. */
  onEnterEdit: () => void
  /** Dismiss the overlay without adding anything (start from a blank floor). */
  onDismiss: () => void
}

const TEMPLATE_ICONS = [Building2, LayoutGrid, Square]

/**
 * Shown when the scene has no objects. Offers a running start — a template or a
 * blank floor — instead of an intimidating empty grid.
 */
export const EmptyOffice = ({ readOnly, onEnterEdit, onDismiss }: Props) => {
  const load = useEditorStore((s) => s.load)

  const pickTemplate = (template: OfficeTemplate) => {
    load(template.build())
    if (readOnly) onEnterEdit()
  }

  const startBlank = () => {
    onEnterEdit()
    onDismiss()
  }

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-overlay/90 p-6 shadow-overlay backdrop-blur-md">
        <EmptyState
          className="max-w-none"
          icon={PencilRuler}
          title="This office is empty"
          description="Start from a template, or a blank floor and draw your first wall."
        >
          <div className="grid grid-cols-2 gap-2.5">
            {TEMPLATES.map((t, i) => {
              const Icon = TEMPLATE_ICONS[i] ?? LayoutGrid
              // The first (fully furnished) template is featured full-width.
              const featured = i === 0
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-foreground/5",
                    featured
                      ? "col-span-2 flex-row gap-3 border-accent/40 text-left"
                      : "flex-col border-border"
                  )}
                >
                  <span
                    className={clsx(
                      "grid size-10 shrink-0 place-items-center rounded-lg",
                      featured ? "bg-accent/15 text-accent" : "bg-foreground/5 text-muted"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">{t.label}</span>
                    {featured && t.description && (
                      <span className="block text-xs text-muted">{t.description}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={startBlank}
            className="mt-3 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Start from blank →
          </button>
        </EmptyState>
      </div>
    </div>
  )
}
