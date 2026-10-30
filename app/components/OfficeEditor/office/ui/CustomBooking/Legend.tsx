import clsx from "clsx"
import { Armchair, ArrowLeftRight, Check } from "lucide-react"
import { type ReactNode } from "react"
import type { Translator } from "~/i18n/translate"

export const Legend = ({ i18n: { t } }: { i18n: Translator }) => (
  <ul className="flex flex-col gap-2 pt-9 text-xs text-muted">
    <li className="mb-1 leading-snug">
      {t("Tap a weekday or a week number to pick all of it at once.")}
    </li>
    <LegendItem
      swatch="bg-accent text-accent-foreground"
      icon={<Check className="size-2.5" strokeWidth={3.5} />}
    >
      {t("Picked")}
    </LegendItem>
    <LegendItem swatch="border-[1.5px] border-border bg-surface">{t("Free")}</LegendItem>
    <LegendItem swatch="bg-surface-tertiary">{t("Taken · tap for another desk")}</LegendItem>
    <LegendItem swatch="border-[1.5px] border-dashed border-accent bg-accent/8">
      {t("Already yours")}
    </LegendItem>
    <LegendItem
      swatch="bg-[color-mix(in_oklab,var(--accent)_72%,black)] text-warning"
      icon={<ArrowLeftRight className="size-2.5" strokeWidth={2.6} />}
    >
      {t("Moves you from another desk")}
    </LegendItem>
    <LegendItem swatch="bg-accent/55 text-foreground" icon={<Armchair className="size-2.5" />}>
      {t("Another desk on a taken day")}
    </LegendItem>
  </ul>
)

const LegendItem = ({
  swatch,
  icon,
  children,
}: {
  swatch: string
  icon?: ReactNode
  children: ReactNode
}) => (
  <li className="flex items-center gap-2">
    <span className={clsx("grid size-3.5 shrink-0 place-items-center rounded-[4px]", swatch)}>
      {icon}
    </span>
    {children}
  </li>
)
