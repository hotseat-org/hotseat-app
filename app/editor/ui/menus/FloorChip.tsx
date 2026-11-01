import clsx from "clsx"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { getFloorNumber, getFloorTitle } from "../../floors"
import { useFloorNotes } from "../../modules"
import { useEditorStore } from "../../store"
import { Slab, composeFloorLabel, useFloorName } from "./FloorPicker"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { useI18n } from "~/i18n/I18nProvider"

/** The chip's height (px): what the plan keeps clear under it. */
export const FLOOR_CHIP_HEIGHT = 40

/**
 * A phone's floors: a chip under the top bar, always naming the floor shown —
 * a tap opens a sheet of them all, top floor first, each with the modules'
 * word on it (the office: "6 free"). Only with floors to choose from.
 */
export const FloorChip = ({ top }: { top: number }) => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const showFloor = useEditorStore((state) => state.showFloor)
  const getFloorName = useFloorName()
  const floorNotes = useFloorNotes()
  const [isOpen, setIsOpen] = useState(false)
  const shown = floors.find((floor) => floor.id === currentFloor)
  if (floors.length < 2 || !shown) return null

  const shownNumber = getFloorTitle({ t }, getFloorNumber(floors, shown.id))

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t("{floor}. Choose a floor", { floor: getFloorName(shown) })}
        onClick={() => setIsOpen(true)}
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute left-4 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-chrome-border bg-chrome pl-2 pr-3 text-sm font-extrabold text-foreground shadow-overlay outline-none focus-visible:ring-2 focus-visible:ring-focus"
        style={{ top, height: FLOOR_CHIP_HEIGHT }}
      >
        <Slab look="shown" />
        <span className="truncate">
          {shown.name ? `${shownNumber} · ${shown.name}` : shownNumber}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>

      {isOpen && (
        <BottomSheet title={t("Choose a floor")} onClose={() => setIsOpen(false)}>
          {(close) => (
            <ul className="flex flex-col gap-1">
              {[...floors].reverse().map((floor) => {
                const isShown = floor.id === currentFloor
                const note = floorNotes?.get(floor.id)
                const number = getFloorTitle({ t }, getFloorNumber(floors, floor.id))

                return (
                  <li key={floor.id}>
                    <button
                      type="button"
                      aria-current={isShown || undefined}
                      aria-label={composeFloorLabel(getFloorName(floor), note)}
                      onClick={() => {
                        showFloor(floor.id)
                        close()
                      }}
                      className={clsx(
                        "group flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        isShown && "bg-accent/10"
                      )}
                    >
                      <span className="relative shrink-0">
                        <Slab look={isShown ? "shown" : "other"} />
                        {note?.yours && (
                          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-success ring-2 ring-overlay" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={clsx(
                            "truncate text-[15px]",
                            isShown ? "font-black text-accent" : "font-extrabold text-foreground"
                          )}
                        >
                          {floor.name || number}
                        </span>
                        {(floor.name || note?.yours) && (
                          <span className="truncate text-xs text-muted">
                            {[floor.name && number, note?.yours].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                      {note && (
                        <span
                          className={clsx(
                            "shrink-0 text-sm font-extrabold",
                            note.tone === "positive" ? "text-success" : "text-warning"
                          )}
                        >
                          {note.text}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </BottomSheet>
      )}
    </>
  )
}
