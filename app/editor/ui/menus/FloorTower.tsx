import clsx from "clsx"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { getFloorNumber } from "../../floors"
import { useFloorNotes } from "../../modules"
import { useEditorStore } from "../../store"
import { composeFloorLabel, useFloorName } from "./FloorPicker"
import { useI18n } from "~/i18n/I18nProvider"

/** A slab's size on screen (px), and how far apart they sit gathered up: a small building. */
const SLAB_WIDTH = 96
const SLAB_HEIGHT = 51
const GATHERED_STEP = 11
/** Spread out: this far apart — closer with many floors, so the tower keeps to this height. */
const SPREAD_STEP = 46
const MAX_SPREAD_HEIGHT = 380
/** How long the pointer may leave before it gathers up again (ms): crossing a gap doesn't. */
const GATHER_DELAY = 160

/** The springy ease of the spread (it overshoots a little), and its stagger per floor (ms). */
const SPRING = "cubic-bezier(0.2, 0.9, 0.25, 1.15)"
const STAGGER = 28

/**
 * Viewing: the floors as a tower of slabs, gathered up tight like a small
 * building, the shown one in the accent with its name beside it. Pointed at
 * (or focused), the tower spreads out from its middle, springing, each floor
 * with its name and the modules' word on it (the office: "6 free"); pressing
 * one shows it. Spread out, any number of floors keeps to one height. Only
 * with floors to choose from; a phone has its own (see FloorChip).
 */
export const FloorTower = () => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const showFloor = useEditorStore((state) => state.showFloor)
  const getFloorName = useFloorName()
  const floorNotes = useFloorNotes()
  const [isSpread, setIsSpread] = useState(false)
  const gatherTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(gatherTimer.current), [])
  if (floors.length < 2) return null

  const spread = () => {
    clearTimeout(gatherTimer.current)
    setIsSpread(true)
  }
  const gather = () => {
    clearTimeout(gatherTimer.current)
    gatherTimer.current = setTimeout(() => setIsSpread(false), GATHER_DELAY)
  }

  // Top floor first, round the tower's middle.
  const topFirst = [...floors].reverse()
  const shownIndex = topFirst.findIndex((floor) => floor.id === currentFloor)
  const step = isSpread
    ? Math.min(SPREAD_STEP, MAX_SPREAD_HEIGHT / (topFirst.length - 1))
    : GATHERED_STEP
  const height = (topFirst.length - 1) * step + SLAB_HEIGHT
  const top = -height / 2

  return (
    // Its middle at this height: the tower grows up and down from it.
    <div className="relative h-0" style={{ width: SLAB_WIDTH }}>
      <div
        role="radiogroup"
        aria-label={t("Choose a floor")}
        className="pointer-events-auto absolute right-0 transition-[top,height] duration-500"
        style={{ top, height, width: SLAB_WIDTH, transitionTimingFunction: SPRING }}
        onPointerEnter={spread}
        onPointerLeave={gather}
        onFocus={spread}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) gather()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        // Up and down move a floor (the top of the tower is the top floor).
        onKeyDown={(event) => {
          const floorStep = { ArrowUp: 1, ArrowDown: -1 }[event.key]
          if (!floorStep) return

          event.preventDefault()
          const index = floors.findIndex((floor) => floor.id === currentFloor)
          const next = floors[index + floorStep]
          if (!next) return

          showFloor(next.id)
          // The focus goes with it (the shown floor is the one in the tab order).
          const group = event.currentTarget
          requestAnimationFrame(() =>
            group.querySelector<HTMLElement>("[aria-checked=true]")?.focus()
          )
        }}
      >
        {topFirst.map((floor, index) => {
          const isShown = index === shownIndex
          const note = floorNotes?.get(floor.id)
          const name =
            floor.name || t("Floor {number}", { number: getFloorNumber(floors, floor.id) })
          const style: CSSProperties = {
            top: index * step,
            zIndex: topFirst.length - index,
            transition: `top 520ms ${SPRING}`,
            transitionDelay: `${index * STAGGER}ms`,
          }

          return (
            <button
              key={floor.id}
              type="button"
              role="radio"
              aria-checked={isShown}
              tabIndex={isShown ? 0 : -1}
              aria-label={composeFloorLabel(getFloorName(floor), note)}
              // The camera follows (see FloorShift): no refit.
              onClick={() => showFloor(floor.id)}
              className="group absolute right-0 flex items-center outline-none"
              style={style}
            >
              {/* Beside it: its name and word — the shown floor's always, the others' spread out. */}
              <span
                className={clsx(
                  "pointer-events-none absolute right-full mr-3 flex flex-col items-end whitespace-nowrap transition-[opacity,transform] duration-300",
                  isSpread || isShown ? "translate-x-0 opacity-100" : "translate-x-2.5 opacity-0"
                )}
                style={{ transitionDelay: isSpread ? `${80 + index * 40}ms` : "0ms" }}
              >
                <span
                  className={clsx(
                    "rounded-md px-1 text-sm font-extrabold [text-shadow:0_1px_6px_var(--surface)]",
                    isShown ? "text-accent" : "text-foreground"
                  )}
                >
                  {name}
                </span>
                {note && (
                  <span className="flex items-center gap-1.5 text-xs font-extrabold [text-shadow:0_1px_6px_var(--surface)]">
                    {note.yours && (
                      <span className="rounded-full bg-success/15 px-1.5 text-[11px] text-success">
                        {note.yours}
                      </span>
                    )}
                    <span className={note.tone === "positive" ? "text-success" : "text-warning"}>
                      {note.text}
                    </span>
                  </span>
                )}
              </span>

              <span className="relative block transition-transform duration-300 group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
                <TowerSlab isShown={isShown} />
                <span
                  className={clsx(
                    "absolute left-1/2 top-[17px] -translate-x-1/2 text-xs font-black",
                    isShown ? "text-accent-foreground" : "text-muted"
                  )}
                >
                  {getFloorNumber(floors, floor.id)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** A floor's slab: its top and, under it, its edge — the shown one in the accent, glowing. */
const TowerSlab = ({ isShown }: { isShown: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 0 124 66"
    className={clsx(
      "block overflow-visible transition-[filter] duration-300",
      isShown && "drop-shadow-[0_10px_18px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
    )}
    style={{ width: SLAB_WIDTH, height: SLAB_HEIGHT }}
  >
    <path
      d="M4 31 L62 58 L120 31 L120 39 L62 66 L4 39 Z"
      className={isShown ? "fill-accent/70" : "fill-border"}
    />
    <path
      d="M62 4 L120 31 L62 58 L4 31 Z"
      strokeWidth={1.25}
      strokeLinejoin="round"
      className={clsx(
        "transition-[fill,stroke] duration-200",
        isShown
          ? "fill-accent stroke-accent"
          : "fill-surface stroke-border group-hover:stroke-accent group-focus-visible:stroke-accent"
      )}
    />
  </svg>
)
