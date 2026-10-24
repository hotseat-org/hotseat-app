import { Button, Popover } from "@heroui/react"
import clsx from "clsx"
import { ArrowUpFromLine, Check, SlidersHorizontal, type LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { useEditorStore } from "~/components/OfficeEditor/store"
import { DESK_FEATURES, isSeatable, type DeskFeature } from "~/components/OfficeEditor/types"
import { useI18n } from "~/i18n/I18nProvider"

const FEATURE_ICONS: Record<DeskFeature, LucideIcon> = { standing: ArrowUpFromLine }

/**
 * The map's desk filter: an icon button opening a list of desk features
 * (Standing desk…). On, the desks without them fade and lose their "Free"
 * marks; the button lights up with how many are on. `isCompact`: the phone's
 * day dock size.
 */
export const DeskFilter = ({ isCompact = false }: { isCompact?: boolean }) => {
  const { t, tn } = useI18n()
  const filter = useEditorStore((s) => s.deskFilter)
  const toggle = useEditorStore((s) => s.toggleDeskFilter)
  // Only features some desk here has: no filter for nothing.
  const objects = useEditorStore((s) => s.objects)
  const offered = useMemo(
    () =>
      DESK_FEATURES.map((f) => ({
        ...f,
        count: objects.filter((o) => isSeatable(o.type) && o.features?.includes(f.id)).length,
      })).filter((f) => f.count > 0),
    [objects]
  )
  if (!offered.length) return null
  const activeCount = filter.length
  const label = activeCount ? t("Filtering desks ({n} on)", { n: activeCount }) : t("Filter desks")

  return (
    <Popover>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={label}
        className={clsx(
          "relative shrink-0",
          isCompact ? "h-12 w-11 rounded-xl" : "size-8 rounded-full",
          activeCount
            ? "bg-accent/15 text-accent"
            : isCompact
              ? "bg-foreground/[0.07] text-foreground"
              : "text-muted hover:bg-foreground/10 hover:text-foreground"
        )}
      >
        <SlidersHorizontal className={isCompact ? "size-5" : "size-4"} />
        {activeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground ring-2 ring-overlay">
            {activeCount}
          </span>
        )}
      </Button>
      <Popover.Content placement="top" className="rounded-2xl">
        <Popover.Dialog aria-label={t("Filter desks")} className="w-64 p-1.5 outline-none">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-extrabold text-muted">{t("Show only")}</p>
          <ul className="flex flex-col gap-0.5">
            {offered.map((f) => {
              const isOn = filter.includes(f.id)
              const Icon = FEATURE_ICONS[f.id]
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggle(f.id)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                      isOn ? "bg-accent/10" : "hover:bg-foreground/5"
                    )}
                  >
                    <span
                      className={clsx(
                        "grid size-8 shrink-0 place-items-center rounded-lg",
                        isOn
                          ? "bg-accent text-accent-foreground"
                          : "bg-foreground/[0.07] text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">
                        {t(f.labelPlural)}
                      </span>
                      <span className="block text-xs text-muted">
                        {tn(f.count, "{n} desk here", "{n} desks here")}
                      </span>
                    </span>
                    {isOn && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
