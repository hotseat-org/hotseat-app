import { ToggleButton, Tooltip } from "@heroui/react"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"
import {
  Ban,
  Eraser,
  LayoutGrid,
  LayoutTemplate,
  MousePointer2,
  PaintBucket,
  Rows3,
  Square,
  type LucideIcon,
} from "lucide-react"
import { useEditorStore } from "../../store"
import { isRecolorable } from "../../types"
import { FLOOR_SWATCHES, SWATCHES } from "../../palette"
import type { PlacementPattern } from "../../layout"
import { getItem } from "../../catalog"
import { KitsPanel } from "../../kits/KitsPanel"
import {
  getCatalogCategories,
  getToolMeta,
  categoryOf,
  colorKey,
  isCatalogItem,
  isRepeatable,
  type Category,
} from "./categories"
import { PREVIEW_SIZE, requestThumbnail } from "./thumbnails"
import { useI18n } from "~/i18n/I18nProvider"

// Tile previews (stills + a live canvas on hover) and the studio rendering the
// stills — three.js, so loaded with the catalog (edit mode), not with the
// editor: the simple view never pulls it in. Loaded as a module, not through
// React.lazy: a lazy tile suspends on first render, and React holds a revealed
// Suspense boundary back ~300 ms — every first category open would wait.
type PreviewModule = typeof import("./PreviewView")

/**
 * The Sims-style build catalog: a category rail on the left and a grid of live,
 * turntable 3D previews on the right. Each preview renders the real object as
 * it'll be placed — not an icon. Select/Erase live above the categories.
 *
 * Opening a category just shows its assets — nothing is armed until you pick
 * one. The armed asset always belongs to the open category: opening another
 * category (or closing this one) disarms it, and arming an asset by shortcut
 * opens its category. Select/Erase (which place nothing) collapse the panel.
 */
/** The rail's own "category": the saved rooms (kits). */
const KITS_ID = "kits"

/** The item panel's least height (px), so a few rows of tiles always show. */
const PANEL_MIN_HEIGHT = 560

export const Catalog = () => {
  const { t } = useI18n()
  const tool = useEditorStore((state) => state.tool)
  const setTool = useEditorStore((state) => state.setTool)
  const armedKit = useEditorStore((state) => state.armedKit)
  const placementColors = useEditorStore((state) => state.placementColors)
  const setPlacementColor = useEditorStore((state) => state.setPlacementColor)

  // Pre-render every tile's still in the background, so categories open
  // instantly (tiles on screen jump the queue).
  useEffect(() => {
    for (const entry of getCatalogCategories())
      for (const type of entry.types) requestThumbnail(type, placementColors[colorKey(type)])
    // Once, with the colours as they are on opening the editor.
  }, [])

  const [preview, setPreview] = useState<PreviewModule | null>(null)
  useEffect(() => {
    void import("./PreviewView").then(setPreview)
  }, [])

  const [openId, setOpenId] = useState<string | null>(null)
  const category = getCatalogCategories().find((entry) => entry.id === openId)
  // Arming an asset any other way (number keys) opens its category.
  useEffect(() => {
    const toolCategory = isCatalogItem(tool) ? categoryOf(tool) : undefined
    if (toolCategory) setOpenId(toolCategory.id)
  }, [tool])

  // The armed asset, if it's in the open category (drives the colour picker).
  const armed = category && isCatalogItem(tool) && category.types.includes(tool) ? tool : null
  // The colour chosen for the armed type (null = its default); Room → walls'.
  // Doors have none: always wood.
  const canColor = !!armed && isRecolorable(armed)
  const colorType = armed && canColor ? colorKey(armed) : null
  const getColorLabel = () => {
    if (canColor) return t("Colour")
    if (armed) return t("Colour — doors are wood")

    return t("Colour — pick an item")
  }
  const activeColor = colorType ? (placementColors[colorType] ?? null) : null

  const toggleCategory = (id: string) => {
    // Don't leave an asset from another (or the closing) category armed.
    if (isCatalogItem(tool) || armedKit) setTool("select")

    setOpenId((currentId) => (currentId === id ? null : id))
  }
  // The panel is as tall as the tray — but at least PANEL_MIN_HEIGHT (the
  // two-column tray is short), within the screen; tiles scroll inside it.
  const railRef = useRef<HTMLDivElement>(null)
  const [railHeight, setRailHeight] = useState(0)
  useEffect(() => {
    const element = railRef.current
    if (!element) return

    const observer = new ResizeObserver(() => setRailHeight(element.offsetHeight))
    observer.observe(element)

    return () => observer.disconnect()
  }, [])
  const panelStyle = railHeight
    ? { height: Math.max(railHeight, PANEL_MIN_HEIGHT), maxHeight: "calc(100dvh - 10rem)" }
    : undefined

  const pickMode = (mode: "select" | "delete" | "paint") => {
    setOpenId(null)
    setTool(mode)
  }

  // Only the rail sizes this box, so it stays centred on the screen no matter
  // what the (absolutely positioned) preview panel does.
  return (
    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
      {preview && <preview.ThumbnailStudio />}
      {/* Category tray: the tools in a row on top, then the categories as a
          two-column grid of illustrated, named tiles. */}
      <div
        ref={railRef}
        data-tour="catalog"
        className="pointer-events-auto flex max-h-[calc(100dvh-10rem)] w-42 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-border bg-overlay/90 p-2 shadow-overlay backdrop-blur-md [scrollbar-width:none]"
      >
        <div className="grid grid-cols-3 gap-1">
          <RailButton
            label={t("Select")}
            shortcut="1"
            active={tool === "select" && !category && !armedKit}
            onClick={() => pickMode("select")}
          >
            <MousePointer2 className="size-5" strokeWidth={2} />
          </RailButton>
          <RailButton
            label={t("Erase")}
            shortcut="0"
            active={tool === "delete"}
            danger
            onClick={() => pickMode("delete")}
          >
            <Eraser className="size-5" strokeWidth={2} />
          </RailButton>
          <RailButton
            label={t("Paint")}
            active={tool === "paint"}
            onClick={() => pickMode("paint")}
          >
            <PaintBucket className="size-5" strokeWidth={2} />
          </RailButton>
        </div>

        <div className="h-px shrink-0 bg-separator" />

        <div className="grid grid-cols-2 gap-1.5">
          {getCatalogCategories().map((entry) => (
            <CategoryButton
              key={entry.id}
              category={entry}
              label={t(entry.label)}
              active={openId === entry.id}
              onClick={() => toggleCategory(entry.id)}
            />
          ))}
        </div>

        <div className="h-px shrink-0 bg-separator" />
        <ToggleButton
          variant="ghost"
          isSelected={openId === KITS_ID}
          onPress={() => toggleCategory(KITS_ID)}
          className={clsx(
            "flex h-auto w-full items-center justify-start gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors",
            openId === KITS_ID
              ? "bg-accent/15 text-foreground ring-2 ring-inset ring-accent"
              : "text-muted hover:bg-foreground/10 hover:text-foreground"
          )}
        >
          <LayoutTemplate className="size-5 shrink-0" />
          {t("Saved rooms")}
        </ToggleButton>
      </div>

      {openId === KITS_ID && <KitsPanel style={panelStyle} />}

      {/* Paint: colour choice + how-to, in the same slot/size as a category. */}
      {tool === "paint" && !category && <PaintPanel style={panelStyle} />}

      {/* Preview grid — only while an asset (a category) is armed, so Select and
          Erase collapse the catalog to just the rail. */}
      {category && (
        // Fixed height (see panelStyle): title on top, colour swatches pinned
        // at the bottom, and the tile grid scrolls in between.
        <div
          style={panelStyle}
          className="pointer-events-auto absolute left-full top-0 ml-2 flex w-60 flex-col rounded-2xl border border-border bg-overlay/90 p-3 shadow-overlay backdrop-blur-md"
        >
          <h2
            className={clsx(
              "shrink-0 px-1 text-sm font-semibold text-foreground",
              category.hint ? "mb-0.5" : "mb-2"
            )}
          >
            {t(category.label)}
          </h2>
          {category.hint && (
            <p className="mb-2 shrink-0 px-1 text-[11px] leading-snug text-muted">
              {t(category.hint)}
              {/* A link to another tool (Seating's: the bookable desk). */}
              {category.hintAction && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => category.hintAction && setTool(category.hintAction.tool)}
                    className="font-semibold text-accent hover:underline"
                  >
                    {t(category.hintAction.label)}
                  </button>
                </>
              )}
            </p>
          )}

          <div className="-mr-2 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin]">
            {category.types.map((type) => {
              const meta = getToolMeta(type)
              const label = meta ? t(meta.label) : type
              const active = tool === type

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTool(type)}
                  title={label}
                  className={clsx(
                    "group flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-colors",
                    active
                      ? "border-accent bg-accent/15"
                      : "border-border bg-foreground/[0.04] hover:border-accent/50 hover:bg-foreground/10"
                  )}
                >
                  <div className="overflow-hidden rounded-lg" style={PREVIEW_SIZE}>
                    {/* Each tile reflects its own per-type colour. */}
                    {preview && (
                      <preview.PreviewTile
                        type={type}
                        color={placementColors[colorKey(type)]}
                        active={active}
                      />
                    )}
                  </div>
                  <span
                    className={clsx(
                      "w-full truncate text-center text-[11px] font-medium",
                      active ? "text-foreground" : "text-muted"
                    )}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Floor furniture: one per click, or a row / pod per drag. */}
          {armed && isRepeatable(armed) && <PatternSwitch />}

          {/* Colour picker for the armed asset — sets the colour of what you place
            next. Always present (reserved space, so nothing jumps); disabled until
            an asset is picked. "Default" (the type's own colour) is a non-colour option, so this
            stays a custom swatch grid rather than HeroUI's ColorSwatchPicker (which
            can't host a null/default chip inline with the colours). */}
          <div
            className={clsx(
              "mt-3 shrink-0 border-t border-separator pt-2.5 transition-opacity",
              !canColor && "pointer-events-none opacity-40"
            )}
            aria-disabled={!canColor}
          >
            <div className="mb-1.5 px-1 text-[11px] font-medium text-muted">{getColorLabel()}</div>
            <div className="flex flex-wrap gap-1.5 px-1">
              <Swatch
                title={t("Default")}
                selected={!!armed && activeColor === null}
                onClick={() => colorType && setPlacementColor(colorType, null)}
              >
                <span
                  className="flex size-full items-center justify-center rounded-md"
                  style={{
                    background: colorType ? getItem(colorType).defaultColor : "transparent",
                  }}
                >
                  <Ban className="size-3.5 text-slate-900/70" strokeWidth={2.5} />
                </span>
              </Swatch>
              {SWATCHES.map((color) => (
                <Swatch
                  key={color}
                  title={color}
                  selected={activeColor === color}
                  onClick={() => colorType && setPlacementColor(colorType, color)}
                >
                  <span className="block size-full rounded-md" style={{ background: color }} />
                </Swatch>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SwatchProps {
  title: string
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}

const Swatch = ({ title, selected, onClick, children }: SwatchProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={clsx(
      "size-6 rounded-md ring-2 ring-offset-2 ring-offset-overlay transition",
      selected ? "ring-foreground" : "ring-transparent hover:ring-foreground/40"
    )}
  >
    {children}
  </button>
)

/**
 * A category in the tray: its illustration with the name underneath. Selected
 * shows as an accent ring on a soft tint (a solid fill would drown the colours).
 */
const CategoryButton = ({
  category,
  label,
  active,
  onClick,
}: {
  category: Category
  label: string
  active: boolean
  onClick: () => void
}) => (
  <ToggleButton
    variant="ghost"
    isSelected={active}
    onPress={onClick}
    className={clsx(
      "group flex h-auto w-full flex-col items-center gap-1 rounded-xl px-1 pb-1.5 pt-2 transition-colors",
      active
        ? "bg-accent/15 text-foreground ring-2 ring-inset ring-accent"
        : "text-muted hover:bg-foreground/10 hover:text-foreground"
    )}
  >
    <category.icon className="size-10 transition-transform duration-150 group-hover:scale-110" />
    <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
      {label}
    </span>
  </ToggleButton>
)

interface RailButtonProps {
  label: string
  shortcut?: string
  active: boolean
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}

const getRailToneClass = (active: boolean, danger?: boolean) => {
  if (!active) return "text-muted hover:bg-foreground/10 hover:text-foreground"
  if (danger) return "bg-danger text-danger-foreground"

  return "bg-accent text-accent-foreground"
}

const RailButton = ({ label, shortcut, active, danger, onClick, children }: RailButtonProps) => (
  <Tooltip delay={350}>
    {/* Controlled isSelected + onPress: re-pressing an armed tool re-selects it
        (never toggles off), matching the old click-to-arm behaviour. */}
    <ToggleButton
      variant="ghost"
      isSelected={active}
      onPress={onClick}
      className={clsx(
        "flex h-auto w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 pb-1 pt-1.5 transition-colors",
        getRailToneClass(active, danger)
      )}
    >
      {children}
      <span className="w-full truncate text-center text-[11px] font-semibold leading-tight">
        {label}
      </span>
    </ToggleButton>
    {/* The name is on the button; the tooltip adds its key. */}
    <Tooltip.Content
      placement="right"
      className="rounded-md border border-border bg-overlay px-2 py-1 text-xs text-foreground shadow-overlay"
    >
      {label}
      {shortcut ? <span className="ml-1 text-muted">{shortcut}</span> : null}
    </Tooltip.Content>
  </Tooltip>
)

/**
 * Paint tool panel: pick a colour, then click a wall (corner to corner; Shift
 * for the whole room's) or a room's floor. "Default" returns it to the theme colour.
 */
const PaintPanel = ({ style }: { style?: React.CSSProperties }) => {
  const { t } = useI18n()
  const paintColor = useEditorStore((state) => state.paintColor)
  const setPaintColor = useEditorStore((state) => state.setPaintColor)

  return (
    <div
      style={style}
      className="pointer-events-auto absolute left-full top-0 ml-2 flex w-60 flex-col rounded-2xl border border-border bg-overlay/90 p-3 shadow-overlay backdrop-blur-md"
    >
      <h2 className="mb-1 shrink-0 px-1 text-sm font-semibold text-foreground">{t("Paint")}</h2>
      <p className="mb-3 shrink-0 px-1 text-xs leading-snug text-muted">
        {t("Click a wall to paint it (⇧ for the inside of the whole room), or a room's floor.")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        <SwatchGroup
          title={t("Walls")}
          colors={SWATCHES}
          value={paintColor}
          onPick={setPaintColor}
        />
        <SwatchGroup
          title={t("Floors")}
          colors={FLOOR_SWATCHES}
          value={paintColor}
          onPick={setPaintColor}
        />
      </div>
      <div className="mt-3 shrink-0 border-t border-separator px-1 pt-2.5">
        <Swatch
          title={t("Default")}
          selected={paintColor === null}
          onClick={() => setPaintColor(null)}
        >
          <span className="flex size-full items-center justify-center rounded-md bg-foreground/10">
            <Ban className="size-3.5 text-muted" strokeWidth={2.5} />
          </span>
        </Swatch>
        <span className="ml-2 align-middle text-[11px] text-muted">{t("Reset to default")}</span>
      </div>
    </div>
  )
}

const SwatchGroup = ({
  title,
  colors,
  value,
  onPick,
}: {
  title: string
  colors: readonly string[]
  value: string | null
  onPick: (color: string) => void
}) => (
  <div className="mb-3">
    <div className="mb-1.5 px-1 text-[11px] font-medium text-muted">{title}</div>
    <div className="flex flex-wrap gap-1.5 px-1">
      {colors.map((color) => (
        <Swatch key={color} title={color} selected={value === color} onClick={() => onPick(color)}>
          <span className="block size-full rounded-md" style={{ background: color }} />
        </Swatch>
      ))}
    </div>
  </div>
)

/**
 * One piece per click, or — dragged on the floor — a row of copies side by
 * side, or a pod: two rows back to back (desks facing each other).
 */
const PatternSwitch = () => {
  const { t } = useI18n()
  const pattern = useEditorStore((state) => state.placementPattern)
  const setPattern = useEditorStore((state) => state.setPlacementPattern)
  const options: { id: PlacementPattern; label: string; icon: LucideIcon }[] = [
    { id: "single", label: t("Single"), icon: Square },
    { id: "row", label: t("Row"), icon: Rows3 },
    { id: "pod", label: t("Pod"), icon: LayoutGrid },
  ]
  const hint = {
    single: t("Click to place one."),
    row: t("Drag along the floor to lay a row."),
    pod: t("Drag to lay two rows back to back."),
  }[pattern]

  return (
    <div className="mt-3 shrink-0 border-t border-separator pt-2.5">
      <div
        role="radiogroup"
        aria-label={t("Placing")}
        className="flex gap-1 rounded-xl bg-foreground/[0.05] p-1"
      >
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={pattern === id}
            onClick={() => setPattern(id)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors",
              pattern === id
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted">{hint}</p>
    </div>
  )
}
