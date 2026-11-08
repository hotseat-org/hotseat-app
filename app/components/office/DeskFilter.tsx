import clsx from "clsx"
import { ArrowUpFromLine, Check, type LucideIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { useOfficeStore } from "~/office/store"
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
  const objects = useOfficeStore((s) => s.objects)
  const filter = useOfficeStore((s) => s.deskFilter)
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
 * outside them fade and lose their "Free" marks. The office's Filter desks side panel:
 * a page of large ruled lines in the office, the editor's small panel while editing.
 */
export const DeskFilterOptions = ({ isEditing = false }: { isEditing?: boolean }) => {
  const { t, tn } = useI18n()
  const filter = useOfficeStore((s) => s.deskFilter)
  const toggle = useOfficeStore((s) => s.toggleDeskFilter)
  const { zones, features } = useDeskFilterOptions()
  const isLarge = !isEditing

  return (
    <ul
      className={clsx(
        "flex flex-col",
        isLarge ? "divide-y divide-separator border-y border-separator" : "gap-0.5"
      )}
    >
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
            isLarge={isLarge}
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
            isLarge={isLarge}
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
  isLarge,
}: {
  isOn: boolean
  onToggle: () => void
  label: string
  hint: string
  icon: ReactNode
  /** The icon tile's own colour (a zone's); otherwise the accent when on. */
  tint?: string
  /** A page's line of large type (the office), not the editor's small row. */
  isLarge: boolean
}) => (
  <li>
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onToggle}
      className={clsx(
        "flex w-full items-center gap-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
        isLarge ? "h-[68px] px-1" : "rounded-xl px-2.5 py-2",
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
        <span
          className={clsx(
            "block truncate text-foreground",
            isLarge ? "text-xl leading-tight font-black tracking-[-0.01em]" : "text-sm font-bold"
          )}
        >
          {label}
        </span>
        <span className={clsx("block text-muted", isLarge ? "text-sm font-semibold" : "text-xs")}>
          {hint}
        </span>
      </span>
      {/* On, a filled ink ring with a tick; off, the empty ring (the large page's checkbox). */}
      {isLarge ? (
        <span
          aria-hidden
          className={clsx(
            "grid size-7 shrink-0 place-items-center rounded-full border-2 border-foreground transition-colors",
            isOn ? "bg-foreground text-background" : "text-transparent"
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : (
        isOn && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />
      )}
    </button>
  </li>
)
