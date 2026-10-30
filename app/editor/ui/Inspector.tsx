import { Button, CloseButton, ColorSwatchPicker } from "@heroui/react"
import clsx from "clsx"
import { Copy, Dices, RotateCw, Trash2 } from "lucide-react"
import { useEditorStore } from "../store"
import { SWATCHES } from "../palette"
import { hasLooks, isEdgeType, isRecolorable, isWallMounted } from "../types"
import { getItem } from "../catalog"
import { useModules } from "../modules"
import { getToolMeta } from "./categories"
import { useI18n } from "~/i18n/I18nProvider"

export const Inspector = () => {
  const { t, tn } = useI18n()
  const selectedId = useEditorStore((state) => state.selectedId)
  const selected = useEditorStore(
    (state) => state.objects.find((object) => object.id === state.selectedId) ?? null
  )
  const count = useEditorStore((state) => state.selection.length)
  // Group actions work for a single piece too (a selection of one).
  const rotateSelection = useEditorStore((state) => state.rotateSelection)
  const colorSelection = useEditorStore((state) => state.colorSelection)
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection)
  const removeSelection = useEditorStore((state) => state.removeSelection)
  const select = useEditorStore((state) => state.select)
  const shuffleLook = useEditorStore((state) => state.shuffleLook)
  const selection = useEditorStore((state) => state.selection)
  // Some kinds aren't copied (retired desks: a copy would place one anew).
  const hasUncopyable = useEditorStore((state) =>
    state.selection.some((id) => {
      const object = state.objects.find((candidate) => candidate.id === id)
      return !!object && !getItem(object.type).isCopyable
    })
  )
  const sections = useModules().flatMap((module) => module.inspectorSections ?? [])
  // Shuffle when every selected piece comes in several looks.
  const shufflable = useEditorStore((state) =>
    state.selection.every((id) => {
      const object = state.objects.find((candidate) => candidate.id === id)
      return !!object && hasLooks(object.type)
    })
  )

  // Doors are always wood: no colour to pick while one is selected.
  const canColor = useEditorStore((state) =>
    state.selection.every((id) => {
      const object = state.objects.find((candidate) => candidate.id === id)
      return !!object && isRecolorable(object.type)
    })
  )

  if (!selectedId || !selected) return null

  const current = selected.color ?? getItem(selected.type).defaultColor
  // Walls/doors sit on grid edges: they can't be turned or copied in place.
  const edge = isEdgeType(selected.type)

  const canRotate = !edge && !isWallMounted(selected.type)
  const canCopy = !edge && !hasUncopyable
  const otherActionCount = [canRotate, shufflable, canCopy].filter(Boolean).length

  return (
    <div className="pointer-events-auto w-64 rounded-2xl border border-border bg-overlay/90 p-4 text-foreground shadow-overlay backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {count > 1
            ? tn(count, "{n} item", "{n} items")
            : t(getToolMeta(selected.type)?.label ?? selected.type)}
        </h3>
        <CloseButton aria-label={t("Deselect")} onPress={() => select(null)} />
      </div>

      {canColor && (
        <>
          <p className="mb-1 text-xs font-medium text-muted">{t("Colour")}</p>
          <ColorSwatchPicker
            aria-label={t("Colour")}
            value={current}
            onChange={(color) => colorSelection(color.toString("hex").toLowerCase())}
            className="mb-4 grid grid-cols-5 justify-items-center gap-1.5"
          >
            {SWATCHES.map((color) => (
              // Size the item (its 2px ring included); the swatch fills it.
              <ColorSwatchPicker.Item key={color} color={color} className="size-9 rounded-xl">
                <ColorSwatchPicker.Swatch />
                <ColorSwatchPicker.Indicator />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </>
      )}

      {/* The modules' sections (the office: a desk's label, resident, zone…). */}
      {sections.map((Section, index) => (
        <Section key={index} selected={selected} count={count} />
      ))}

      {/* Two columns (four labelled buttons don't fit one row); Delete spans
          the row when it would be left on its own. */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Wall items face out from their wall — nothing to rotate. */}
        {canRotate && (
          <Button size="sm" fullWidth variant="tertiary" onPress={rotateSelection}>
            <RotateCw className="size-4" />
            {t("Rotate")}
          </Button>
        )}
        {shufflable && (
          <Button
            size="sm"
            fullWidth
            variant="tertiary"
            onPress={() => shuffleLook(selection)}
            aria-label={t("Shuffle look")}
          >
            <Dices className="size-4" />
            {t("Look")}
          </Button>
        )}
        {canCopy && (
          <Button size="sm" fullWidth variant="tertiary" onPress={duplicateSelection}>
            <Copy className="size-4" />
            {t("Copy")}
          </Button>
        )}
        <Button
          size="sm"
          fullWidth
          variant="danger-soft"
          onPress={removeSelection}
          className={clsx(otherActionCount % 2 === 0 && "col-span-2")}
        >
          <Trash2 className="size-4" />
          {t("Delete")}
        </Button>
      </div>
    </div>
  )
}
