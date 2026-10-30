import { Button, Popover } from "@heroui/react"
import clsx from "clsx"
import {
  Activity,
  Grid3x3,
  Layers as LayersIcon,
  Proportions,
  Ruler,
  Shapes,
  Tag,
  type LucideIcon,
} from "lucide-react"
import { useMemo } from "react"
import { useEditorStore, type Layers } from "../store"
import { hasWebGL } from "../webgl"
import { getZones } from "../zones"
import { REVEAL_LABEL } from "./revealLabel"
import { DeskFilterOptions, useDeskFilterOptions } from "~/components/office/DeskFilter"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

interface LayerRow {
  /** A layer — or the measuring hints / frame rate, kept apart in the store. */
  id: keyof Layers | "measurements" | "frameRate"
  label: string
  hint: string
  icon: LucideIcon
  shortcut?: string
}

const ZONES: LayerRow = {
  id: "zones",
  label: msg("Zones"),
  hint: msg("Team areas and their names"),
  icon: Shapes,
}
const FRAME_RATE: LayerRow = {
  id: "frameRate",
  label: msg("Frame rate"),
  hint: msg("How smoothly the 3D view runs"),
  icon: Activity,
}

const VIEW_ROWS: LayerRow[] = [
  ZONES,
  {
    id: "deskTags",
    label: msg("Desk tags"),
    hint: msg("Who sits where, and free desks"),
    icon: Tag,
  },
]

const EDIT_ROWS: LayerRow[] = [
  ZONES,
  {
    id: "roomSizes",
    label: msg("Room sizes"),
    hint: msg("Floor area and desks in each room"),
    icon: Proportions,
  },
  {
    id: "measurements",
    label: msg("Measurements"),
    hint: msg("Gaps and alignment while placing"),
    icon: Ruler,
    shortcut: "M",
  },
  { id: "grid", label: msg("Grid"), hint: msg("The build grid on the floor"), icon: Grid3x3 },
]

interface Props {
  isEditing?: boolean
  /** The 3D view (the frame rate is only measured there). */
  is3d?: boolean
  /** How it sits: in the map controls (desktop) or the phone's dock. */
  variant?: "stack" | "compact"
  onOpenChange?: (isOpen: boolean) => void
}

/**
 * The Map menu: what the map shows on top of the office (zones, desk tags,
 * room sizes…, remembered in this browser) and, while viewing, which desks
 * — only a zone's, only standing desks… The button counts what's changed:
 * layers hidden plus filters on.
 */
export const MapMenu = ({
  isEditing = false,
  is3d: is3dProp,
  variant = "stack",
  onOpenChange,
}: Props) => {
  const { t, tn } = useI18n()
  const view = useEditorStore((state) => state.view)
  const is3d = is3dProp ?? (isEditing || (hasWebGL() && view === "3d"))
  const layers = useEditorStore((state) => state.layers)
  const toggleLayer = useEditorStore((state) => state.toggleLayer)
  const measureHints = useEditorStore((state) => state.measureHints)
  const toggleMeasureHints = useEditorStore((state) => state.toggleMeasureHints)
  const isFrameRateShown = useEditorStore((state) => state.isFrameRateShown)
  const toggleFrameRate = useEditorStore((state) => state.toggleFrameRate)
  const objects = useEditorStore((state) => state.objects)
  const zoneCount = useMemo(() => getZones(objects).length, [objects])
  const filter = useDeskFilterOptions()
  const hasFilter = !isEditing && filter.hasOptions

  const rows = [...(isEditing ? EDIT_ROWS : VIEW_ROWS), ...(is3d ? [FRAME_RATE] : [])]
  const isOn = (row: LayerRow) =>
    row.id === "measurements"
      ? measureHints
      : row.id === "frameRate"
        ? isFrameRateShown
        : layers[row.id]
  const toggle = (row: LayerRow) =>
    row.id === "measurements"
      ? toggleMeasureHints()
      : row.id === "frameRate"
        ? toggleFrameRate()
        : toggleLayer(row.id)
  // The frame rate is off by default: on isn't a change worth a badge.
  const hiddenCount = rows.filter((row) => row.id !== "frameRate" && !isOn(row)).length
  const changedCount = hiddenCount + (hasFilter ? filter.activeCount : 0)
  const label = changedCount ? tn(changedCount, "Map ({n} change)", "Map ({n} changes)") : t("Map")

  return (
    <Popover onOpenChange={onOpenChange}>
      <Button
        isIconOnly={variant === "compact"}
        variant="ghost"
        size="sm"
        aria-label={label}
        className={clsx(
          "relative shrink-0",
          variant === "compact"
            ? "h-12 w-11 rounded-xl"
            : "h-9 w-auto min-w-0 justify-start rounded-xl px-[9px] text-sm font-semibold",
          changedCount
            ? "bg-accent/15 text-accent"
            : variant === "compact"
              ? "bg-foreground/[0.07] text-foreground"
              : "text-muted hover:bg-foreground/10 hover:text-foreground"
        )}
      >
        <LayersIcon className={variant === "compact" ? "size-5" : "size-[18px]"} />
        {variant === "stack" && <span className={REVEAL_LABEL}>{t("Map")}</span>}
        {changedCount > 0 && (
          <span className="absolute left-5 top-0 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground ring-2 ring-overlay">
            {changedCount}
          </span>
        )}
      </Button>
      <Popover.Content
        placement={variant === "compact" ? "top" : "right bottom"}
        className="rounded-2xl"
      >
        <Popover.Dialog
          aria-label={t("Map")}
          className="max-h-[min(36rem,80dvh)] w-80 overflow-y-auto p-1.5 outline-none"
        >
          <Heading>{t("Show on the map")}</Heading>
          <ul className="flex flex-col gap-0.5">
            {rows.map((row) => {
              const isLayerOn = isOn(row)
              const Icon = row.icon
              const hint =
                row.id === "zones" && zoneCount === 0
                  ? t("None yet — give desks a zone")
                  : t(row.hint)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isLayerOn}
                    onClick={() => toggle(row)}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-foreground/5"
                  >
                    <span
                      className={clsx(
                        "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                        isLayerOn ? "bg-accent/15 text-accent" : "bg-foreground/[0.07] text-muted"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        {t(row.label)}
                        {row.shortcut && (
                          <kbd className="rounded bg-foreground/[0.07] px-1 font-sans text-[10px] font-bold text-muted">
                            {row.shortcut}
                          </kbd>
                        )}
                      </span>
                      <span className="block text-xs leading-snug text-muted">{hint}</span>
                    </span>
                    <Switch isOn={isLayerOn} />
                  </button>
                </li>
              )
            })}
          </ul>
          {hasFilter && (
            <>
              <div className="mx-2.5 my-1.5 h-px bg-separator" />
              <Heading>{t("Show only")}</Heading>
              <DeskFilterOptions />
            </>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

const Heading = ({ children }: { children: string }) => (
  <p className="px-2.5 pb-1 pt-1.5 text-xs font-extrabold text-muted">{children}</p>
)

/** A small switch: on to the right, in the accent. */
const Switch = ({ isOn }: { isOn: boolean }) => (
  <span
    aria-hidden
    className={clsx(
      "relative h-5 w-9 shrink-0 rounded-full transition-colors",
      isOn ? "bg-accent" : "bg-foreground/15"
    )}
  >
    <span
      className={clsx(
        "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left]",
        isOn ? "left-[18px]" : "left-0.5"
      )}
    />
  </span>
)
