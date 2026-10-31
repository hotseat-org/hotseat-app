import { Button, Popover } from "@heroui/react"
import clsx from "clsx"
import {
  Activity,
  Grid3x3,
  Layers as LayersIcon,
  Proportions,
  Ruler,
  type LucideIcon,
} from "lucide-react"
import { useEditorStore, type Layers } from "../../store"
import { hasWebGL } from "../../shell/webgl"
import { useModules } from "../../modules"
import type { SceneObject } from "../../types"
import { REVEAL_LABEL } from "../bars/revealLabel"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

interface LayerRow {
  /** A layer — or the measuring hints / frame rate, kept apart in the store. */
  id: keyof Layers | "measurements" | "frameRate"
  label: string
  hint: string
  icon: LucideIcon
  shortcut?: string
  /** A hint instead, for this layout (a module's layer: see MapLayer.hintFor). */
  hintFor?: (objects: SceneObject[]) => string | null
}

const FRAME_RATE: LayerRow = {
  id: "frameRate",
  label: msg("Frame rate"),
  hint: msg("How smoothly the 3D view runs"),
  icon: Activity,
}

/** The editor's own rows while editing (after the modules' layers). */
const EDIT_ROWS: LayerRow[] = [
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

const getToneClass = (hasChanges: boolean) =>
  hasChanges
    ? "bg-accent/15 text-accent"
    : "text-muted hover:bg-foreground/10 hover:text-foreground"

interface LayerOptions {
  isEditing?: boolean
  /** The 3D view (the frame rate is only measured there); unset, the view shown. */
  is3d?: boolean
}

/**
 * The Map's rows for the mode — the modules' layers, the editor's own, the
 * frame rate — each on or off, and how many are changed (hidden).
 */
export const useMapLayerRows = ({ isEditing = false, is3d: is3dOption }: LayerOptions) => {
  const view = useEditorStore((state) => state.view)
  const is3d = is3dOption ?? (isEditing || (hasWebGL() && view === "3d"))
  const layers = useEditorStore((state) => state.layers)
  const toggleLayer = useEditorStore((state) => state.toggleLayer)
  const measureHints = useEditorStore((state) => state.measureHints)
  const toggleMeasureHints = useEditorStore((state) => state.toggleMeasureHints)
  const isFrameRateShown = useEditorStore((state) => state.isFrameRateShown)
  const toggleFrameRate = useEditorStore((state) => state.toggleFrameRate)
  const modules = useModules()
  const moduleRows: LayerRow[] = modules
    .flatMap((module) => module.mapLayers ?? [])
    .filter((layer) => layer.when === "always" || (layer.when === "editing") === isEditing)
    .map((layer) => ({ ...layer, id: layer.id as keyof Layers }))
  const rows = [...moduleRows, ...(isEditing ? EDIT_ROWS : []), ...(is3d ? [FRAME_RATE] : [])]
  const isOn = (row: LayerRow) => {
    if (row.id === "measurements") return measureHints
    if (row.id === "frameRate") return isFrameRateShown

    return layers[row.id]
  }
  const toggle = (row: LayerRow) => {
    if (row.id === "measurements") return toggleMeasureHints()
    if (row.id === "frameRate") return toggleFrameRate()

    return toggleLayer(row.id)
  }
  // The frame rate is off by default: on isn't a change worth a badge.
  const changedCount = rows.filter((row) => row.id !== "frameRate" && !isOn(row)).length

  return { rows, isOn, toggle, changedCount }
}

/** The Map's switches: in the Map menu, or a phone's sheet. */
export const MapLayerSwitches = (options: LayerOptions) => {
  const { t } = useI18n()
  const objects = useEditorStore((state) => state.objects)
  const { rows, isOn, toggle } = useMapLayerRows(options)

  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((row) => {
        const isLayerOn = isOn(row)
        const Icon = row.icon
        const hint = t(row.hintFor?.(objects) ?? row.hint)

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
  )
}

interface Props extends LayerOptions {
  onOpenChange?: (isOpen: boolean) => void
}

/**
 * The Map menu: what the map shows on top of the office (zones, desk tags,
 * room sizes…, remembered in this browser) — switches only; a feature's own
 * lists and tools are side panels. The button counts the layers hidden. (A
 * phone shows the switches in a sheet of its own: MapLayerSwitches.)
 */
export const MapMenu = ({ onOpenChange, ...options }: Props) => {
  const { t, tn } = useI18n()
  const { changedCount } = useMapLayerRows(options)
  const label = changedCount ? tn(changedCount, "Map ({n} change)", "Map ({n} changes)") : t("Map")

  return (
    <Popover onOpenChange={onOpenChange}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={label}
        className={clsx(
          "relative h-9 w-auto min-w-0 shrink-0 justify-start rounded-xl px-[9px] text-sm font-semibold",
          getToneClass(changedCount > 0)
        )}
      >
        <LayersIcon className="size-[18px]" />
        <span className={REVEAL_LABEL}>{t("Map")}</span>
        {changedCount > 0 && (
          <span className="absolute left-5 top-0 grid size-4 place-items-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground ring-2 ring-overlay">
            {changedCount}
          </span>
        )}
      </Button>
      <Popover.Content placement="right bottom" className="rounded-2xl">
        <Popover.Dialog
          aria-label={t("Map")}
          className="max-h-[min(36rem,80dvh)] w-80 overflow-y-auto p-1.5 outline-none"
        >
          <Heading>{t("Show on the map")}</Heading>
          <MapLayerSwitches {...options} />
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
