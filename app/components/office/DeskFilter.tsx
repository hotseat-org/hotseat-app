import clsx from "clsx"
import { ArrowUpFromLine, Check, type LucideIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { useEditorStore } from "~/editor/store"
import { DESK_FEATURES, type DeskFeature } from "~/office/desks/deskFeatures"
import { isSeatable } from "~/office/catalog"
import { ZONE_FILTER_PREFIX, getZones } from "~/office/zones/zones"
import { useI18n } from "~/i18n/I18nProvider"

const FEATURE_ICONS: Record<DeskFeature, LucideIcon> = { standing: ArrowUpFromLine }

/**
 * What the map's desk filter can offer here: the office's zones and the desk
 * features some desk has (no filter for nothing), and how many are on.
 */
export const useDeskFilterOptions = () => {
  const objects = useEditorStore((s) => s.objects)
  const filter = useEditorStore((s) => s.deskFilter)
  const features = useMemo(
    () =>
      DESK_FEATURES.map((feature) => ({
        ...feature,
        count: objects.filter(
          (object) => isSeatable(object.type) && object.features?.includes(feature.id)
        ).length,
      })).filter((feature) => feature.count > 0),
    [objects]
  )
  const zones = useMemo(() => getZones(objects), [objects])
  return {
    zones,
    features,
    activeCount: filter.length,
    hasOptions: zones.length + features.length > 0,
  }
}

/**
 * The desk filter's choices — zones, then desk features. On, the desks
 * outside them fade and lose their "Free" marks. Part of the Map menu.
 */
export const DeskFilterOptions = () => {
  const { t, tn } = useI18n()
  const filter = useEditorStore((s) => s.deskFilter)
  const toggle = useEditorStore((s) => s.toggleDeskFilter)
  const { zones, features } = useDeskFilterOptions()

  return (
    <ul className="flex flex-col gap-0.5">
      {zones.map((zone) => {
        const key = `${ZONE_FILTER_PREFIX}${zone.name}`
        return (
          <FilterRow
            key={key}
            isOn={filter.includes(key)}
            onToggle={() => toggle(key)}
            label={zone.name}
            hint={tn(zone.deskCount, "{n} desk here", "{n} desks here")}
            icon={<span className="size-3 rounded-full" style={{ background: zone.color }} />}
            tint={`${zone.color}33`}
          />
        )
      })}
      {features.map((feature) => {
        const Icon = FEATURE_ICONS[feature.id]
        return (
          <FilterRow
            key={feature.id}
            isOn={filter.includes(feature.id)}
            onToggle={() => toggle(feature.id)}
            label={t(feature.labelPlural)}
            hint={tn(feature.count, "{n} desk here", "{n} desks here")}
            icon={<Icon className="size-4" />}
          />
        )
      })}
    </ul>
  )
}

const FilterRow = ({
  isOn,
  onToggle,
  label,
  hint,
  icon,
  tint,
}: {
  isOn: boolean
  onToggle: () => void
  label: string
  hint: string
  icon: ReactNode
  /** The icon tile's own colour (a zone's); otherwise the accent when on. */
  tint?: string
}) => (
  <li>
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
        isOn ? "bg-accent/10" : "hover:bg-foreground/5"
      )}
    >
      <span
        className={clsx(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          !tint &&
            (isOn ? "bg-accent text-accent-foreground" : "bg-foreground/[0.07] text-foreground")
        )}
        style={tint ? { background: tint } : undefined}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      {isOn && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />}
    </button>
  </li>
)
