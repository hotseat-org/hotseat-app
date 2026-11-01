import clsx from "clsx"
import { Plus } from "lucide-react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react"
import { MAX_FLOORS, getFloorId, getFloorNumber, getFloorTitle } from "../../floors"
import { useFloorNotes } from "../../modules"
import { useEditorStore } from "../../store"
import { FloorsMenu, composeFloorLabel, useFloorName } from "./FloorsMenu"
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
/** How far past the tower's ends the pointer still holds it open (px). */
const HOLD_MARGIN = 12
/** Editing: room above the tower for the floors' menu button (px). */
const MENU_ROOM = 46

/** The springy ease of the spread (it overshoots a little), and its stagger per floor (ms). */
const SPRING = "cubic-bezier(0.2, 0.9, 0.25, 1.15)"
const STAGGER = 28

/** What shows beside a floor: a few words, coloured. */
interface FloorWord {
  text: string
  className: string
  /** What of yours is there ("your desk"). */
  yours?: string
}

/** Editing: how many pieces stand on each floor, by its id. */
const useItemCounts = () => {
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const objects = useEditorStore((state) => state.objects)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)
  const keptPieces = useEditorStore((state) => state.keptPieces)

  return useMemo(() => {
    const counts = new Map(floors.map((floor) => [floor.id, 0]))
    counts.set(currentFloor, objects.length)
    for (const piece of [...otherFloorsPieces, ...keptPieces]) {
      const id = getFloorId(piece, floors)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    return counts
  }, [floors, currentFloor, objects, otherFloorsPieces, keptPieces])
}

/**
 * The floors as a tower of slabs, gathered up tight like a small building,
 * the shown one in the accent with its name beside it. Pointed at (or
 * focused), the tower spreads out, springing, each floor with its name and
 * a word on it; pressing one shows it. Spread out, any number of floors keeps
 * to one height.
 *
 * Viewing (only with floors to choose from): on the right edge, spreading
 * from its middle; the word is the modules' (the office: "6 free"). Editing:
 * top right, spreading down; the word is how much is on it, a ghost slab on
 * top adds a floor (spread out), and the floors' menu (names, order, delete)
 * is above. A phone has its own (see FloorChip).
 */
export const FloorTower = ({ isEditing = false }: { isEditing?: boolean }) => {
  const { t, tn } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const showFloor = useEditorStore((state) => state.showFloor)
  const addFloor = useEditorStore((state) => state.addFloor)
  const getFloorName = useFloorName()
  const floorNotes = useFloorNotes()
  const itemCounts = useItemCounts()
  const [isSpread, setIsSpread] = useState(false)
  const gatherTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const anchor = useRef<HTMLDivElement>(null)
  useEffect(() => () => clearTimeout(gatherTimer.current), [])
  if (!isEditing && floors.length < 2) return null

  const spread = () => {
    clearTimeout(gatherTimer.current)
    setIsSpread(true)
  }
  const gather = () => {
    clearTimeout(gatherTimer.current)
    gatherTimer.current = setTimeout(() => setIsSpread(false), GATHER_DELAY)
  }

  // Top floor first — under the ghost slab, editing (while a floor fits).
  const topFirst = [...floors].reverse()
  const shownIndex = topFirst.findIndex((floor) => floor.id === currentFloor)
  const hasGhost = isEditing && floors.length < MAX_FLOORS
  const firstRow = hasGhost ? 1 : 0
  const rowCount = topFirst.length + firstRow
  const step = isSpread
    ? Math.min(SPREAD_STEP, MAX_SPREAD_HEIGHT / Math.max(1, rowCount - 1))
    : GATHERED_STEP
  const height = (rowCount - 1) * step + SLAB_HEIGHT
  // Viewing, its middle at the anchor (it grows up and down); editing, its
  // top under the menu button (it grows down).
  const top = isEditing ? MENU_ROOM : -height / 2

  // Over the tower as it's laid out, not as it moves: a slab springing past
  // the pointer (or one still settling, gathering up) doesn't spread it again.
  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    const towerTop = (anchor.current?.getBoundingClientRect().top ?? 0) + top
    const isOver =
      event.clientY >= towerTop - HOLD_MARGIN && event.clientY <= towerTop + height + HOLD_MARGIN
    if (isOver) spread()
    else gather()
  }

  const getWord = (id: string): FloorWord | undefined => {
    if (isEditing)
      return {
        text: tn(itemCounts.get(id) ?? 0, "{n} item", "{n} items"),
        className: "text-muted",
      }

    const note = floorNotes?.get(id)

    return (
      note && {
        text: note.text,
        className: note.tone === "positive" ? "text-success" : "text-warning",
        yours: note.yours,
      }
    )
  }

  /** Where row `row` stands, and how it moves there. */
  const getRowStyle = (row: number): CSSProperties => ({
    top: row * step,
    zIndex: rowCount - row,
    transition: `top 520ms ${SPRING}`,
    transitionDelay: `${row * STAGGER}ms`,
  })

  return (
    // The anchor: the tower's middle (viewing) or the column's top (editing).
    <div ref={anchor} className="relative h-0" style={{ width: SLAB_WIDTH }}>
      {isEditing && (
        <div className="pointer-events-auto absolute right-[30px] top-0">
          <FloorsMenu />
        </div>
      )}

      <div
        role="radiogroup"
        aria-label={t("Choose a floor")}
        className="pointer-events-auto absolute right-0 transition-[top,height] duration-500"
        style={{ top, height, width: SLAB_WIDTH, transitionTimingFunction: SPRING }}
        onPointerEnter={handlePointer}
        onPointerMove={handlePointer}
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
        {hasGhost && (
          // Only spread out: gathered up, it would cover the top floor.
          <button
            type="button"
            aria-label={t("Add a floor on top")}
            onClick={addFloor}
            className={clsx(
              "group absolute right-0 flex items-center outline-none transition-opacity duration-300",
              !isSpread && "opacity-0"
            )}
            style={getRowStyle(0)}
          >
            <FloorLabel isShown={isSpread} delay={isSpread ? 80 : 0}>
              <span className="text-sm font-extrabold text-muted group-hover:text-accent">
                {t("Add a floor on top")}
              </span>
            </FloorLabel>
            <span className="relative block transition-transform duration-300 group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
              <GhostSlab />
              <Plus className="absolute left-1/2 top-[15px] size-4 -translate-x-1/2 text-muted group-hover:text-accent" />
            </span>
          </button>
        )}

        {topFirst.map((floor, index) => {
          const row = index + firstRow
          const isShown = index === shownIndex
          const word = getWord(floor.id)
          const name = floor.name || getFloorTitle({ t }, getFloorNumber(floors, floor.id))

          return (
            <button
              key={floor.id}
              type="button"
              role="radio"
              aria-checked={isShown}
              tabIndex={isShown ? 0 : -1}
              aria-label={
                isEditing
                  ? `${getFloorName(floor)}, ${word?.text}`
                  : composeFloorLabel(getFloorName(floor), floorNotes?.get(floor.id))
              }
              // The camera follows (see FloorShift): no refit.
              onClick={() => showFloor(floor.id)}
              className="group absolute right-0 flex items-center outline-none"
              style={getRowStyle(row)}
            >
              {/* Beside it: its name and word — the shown floor's always, the others' spread out. */}
              <FloorLabel isShown={isSpread || isShown} delay={isSpread ? 80 + row * 40 : 0}>
                <span
                  className={clsx(
                    "rounded-md px-1 text-sm font-extrabold",
                    isShown ? "text-accent" : "text-foreground"
                  )}
                >
                  {name}
                </span>
                {word && (
                  <span className="flex items-center gap-1.5 text-xs font-extrabold">
                    {word.yours && (
                      <span className="rounded-full bg-success/15 px-1.5 text-[11px] text-success">
                        {word.yours}
                      </span>
                    )}
                    <span className={word.className}>{word.text}</span>
                  </span>
                )}
              </FloorLabel>

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

/** A slab's label, floating beside it: shown, or slid in faded out. */
const FloorLabel = ({
  isShown,
  delay,
  children,
}: {
  isShown: boolean
  /** Before it shows (ms): the labels follow the slabs out. */
  delay: number
  children: ReactNode
}) => (
  <span
    className={clsx(
      "pointer-events-none absolute right-full mr-3 flex flex-col items-end whitespace-nowrap transition-[opacity,transform] duration-300 [text-shadow:0_1px_6px_var(--surface)]",
      isShown ? "translate-x-0 opacity-100" : "translate-x-2.5 opacity-0"
    )}
    style={{ transitionDelay: `${delay}ms` }}
  >
    {children}
  </span>
)

/** The slab's two faces: its top, and its edge under it. */
const SLAB_EDGE = "M4 31 L62 58 L120 31 L120 39 L62 66 L4 39 Z"
const SLAB_TOP = "M62 4 L120 31 L62 58 L4 31 Z"

/**
 * A floor's slab: its top and, under it, its edge — solid colours mixed from
 * the theme (its border is see-through: stacked, the slabs showed through
 * each other). The shown one in the accent, glowing.
 */
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
      d={SLAB_EDGE}
      className={
        isShown
          ? "fill-[color-mix(in_oklab,var(--accent)_68%,black)]"
          : "fill-[color-mix(in_oklab,var(--default)_70%,black)]"
      }
    />
    <path
      d={SLAB_TOP}
      strokeWidth={1.25}
      strokeLinejoin="round"
      className={clsx(
        "transition-[fill,stroke] duration-200",
        isShown
          ? "fill-accent stroke-[color-mix(in_oklab,var(--accent)_70%,white)]"
          : "fill-[color-mix(in_oklab,var(--default)_92%,var(--foreground))] stroke-[color-mix(in_oklab,var(--default)_72%,var(--foreground))] group-hover:fill-[color-mix(in_oklab,var(--default)_84%,var(--foreground))] group-hover:stroke-accent group-focus-visible:stroke-accent"
      )}
    />
  </svg>
)

/** Editing: the slab of a floor that could be added — dashed, see-through. */
const GhostSlab = () => (
  <svg
    aria-hidden
    viewBox="0 0 124 66"
    className="block overflow-visible"
    style={{ width: SLAB_WIDTH, height: SLAB_HEIGHT }}
  >
    <path
      d={SLAB_TOP}
      strokeWidth={1.5}
      strokeDasharray="5 4"
      strokeLinejoin="round"
      className="fill-overlay/70 stroke-muted transition-[stroke] duration-200 group-hover:stroke-accent group-focus-visible:stroke-accent"
    />
  </svg>
)
