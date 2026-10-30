import clsx from "clsx"
import {
  Building2,
  ChevronDown,
  Coffee,
  Landmark,
  LayoutGrid,
  PencilRuler,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { numberUnlabelledDesks } from "../store"
import { useEditorStore } from "../../store"
import { TEMPLATES, type OfficeTemplate } from "../templates"
import { isSeatable } from "../catalog"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"
import { Button } from "~/components/Button"
import { EmptyState } from "~/components/ui/EmptyState"

interface Props {
  /** True in display mode — picking anything drops into edit mode first. */
  readOnly: boolean
  /**
   * Whether the editor can open here. Not on a phone (or without WebGL): a
   * template still lays the floor out — saved and bookable right away — but
   * drawing from blank needs a computer.
   */
  isEditable: boolean
  /** Switch the editor into edit mode. */
  onEnterEdit: () => void
  /** Dismiss the overlay without adding anything (start from a blank floor). */
  onDismiss: () => void
}

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  "full-office": Building2,
  "team-floor": Users,
  headquarters: Landmark,
  studio: Coffee,
  "open-plan": LayoutGrid,
  "meeting-rooms": Presentation,
}

/** The complete offices first, small to large; the simple starters after. */
const ORDER = ["full-office", "studio", "team-floor", "headquarters", "open-plan", "meeting-rooms"]
const PICKS = [...TEMPLATES].sort(
  (first, second) => ORDER.indexOf(first.id) - ORDER.indexOf(second.id)
)

/** "24 desks" — or, for a layout without any, what it is instead. */
const sizeOf = ({ t, tn }: Translator, template: OfficeTemplate) => {
  const desks = template.build().filter((object) => isSeatable(object.type)).length
  return desks ? tn(desks, "{n} desk", "{n} desks") : t("Meeting rooms only")
}

/**
 * Shown when the scene has no objects. A blank floor is the way in; the
 * ready-made layouts are there, folded away, for a running start. On a phone
 * (no editor) the layouts are the only way, so they show straight away.
 */
export const EmptyOffice = ({ readOnly, isEditable, onEnterEdit, onDismiss }: Props) => {
  const load = useEditorStore((state) => state.load)
  const i18n = useI18n()
  const { t } = i18n
  const sizes = useMemo(() => PICKS.map((pick) => sizeOf(i18n, pick)), [i18n])
  const [isShowingTemplates, setIsShowingTemplates] = useState(!isEditable)

  const pickTemplate = (template: OfficeTemplate) => {
    load(numberUnlabelledDesks(template.build())) // desks get names right away
    if (readOnly && isEditable) onEnterEdit()
  }

  const startBlank = () => {
    onEnterEdit()
    onDismiss()
  }

  const templates = (
    <div className="grid grid-cols-2 gap-2.5">
      {PICKS.map((template, i) => {
        const Icon = TEMPLATE_ICONS[template.id] ?? LayoutGrid
        return (
          <button
            key={template.id}
            type="button"
            title={template.description && t(template.description)}
            onClick={() => pickTemplate(template)}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent/50 hover:bg-foreground/5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-foreground/5 text-muted">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-foreground">
                {t(template.label)}
              </span>
              <span className="block truncate text-xs text-muted">{sizes[i]}</span>
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    // Anchored near the top, not centred: opening the templates grows the
    // card downward instead of shifting it.
    <div className="pointer-events-none absolute inset-0 flex justify-center overflow-y-auto p-6 pt-[12vh]">
      <div className="pointer-events-auto h-fit w-full max-w-md rounded-2xl border border-border bg-overlay/90 p-6 shadow-overlay backdrop-blur-md">
        <EmptyState
          className="max-w-none"
          icon={PencilRuler}
          title={t("This office is empty")}
          description={
            isEditable
              ? t("Draw its walls and place the desks — or start from a ready-made layout.")
              : t("Pick a ready-made floor — desks are bookable right away.")
          }
        >
          {isEditable ? (
            <>
              <Button variant="primary" fullWidth onPress={startBlank}>
                {t("Start from a blank floor")}
              </Button>
              <button
                type="button"
                aria-expanded={isShowingTemplates}
                onClick={() => setIsShowingTemplates((isShowing) => !isShowing)}
                className="mx-auto mt-4 flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                {t("Or start from a template")}
                <ChevronDown
                  className={clsx(
                    "size-4 transition-transform",
                    isShowingTemplates && "rotate-180"
                  )}
                />
              </button>
              {isShowingTemplates && <div className="mt-4">{templates}</div>}
            </>
          ) : (
            <>
              {templates}
              <p className="mt-3 text-xs text-muted">
                {t("To draw your own layout or change it later, open the office on a computer.")}
              </p>
            </>
          )}
        </EmptyState>
      </div>
    </div>
  )
}
