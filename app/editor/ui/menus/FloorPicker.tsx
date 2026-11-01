import { AlertDialog, Button, Dropdown, Popover } from "@heroui/react"
import clsx from "clsx"
import { BrickWall, ChevronDown, ChevronUp, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { MAX_FLOORS, MAX_FLOOR_NAME, getFloorId, getFloorNumber, type Floor } from "../../floors"
import { useFloorNotes } from "../../modules"
import { useEditorStore } from "../../store"
import type { FloorNote } from "../../module"
import { REVEAL_LABEL } from "../bars/revealLabel"
import { useI18n } from "~/i18n/I18nProvider"

/** Most floors the stack shows at once: more scroll by, so it never outgrows its corner. */
const MAX_STACKED = 4

/**
 * Which floors the stack shows (top floor first): all of them, or MAX_STACKED
 * in a row — scrolled by its arrows, and moved along to keep the shown floor
 * in view whenever that changes.
 */
const useStackedFloors = (floors: Floor[], currentFloor: string) => {
  const topFirst = [...floors].reverse()
  const shownIndex = topFirst.findIndex((floor) => floor.id === currentFloor)
  const lastStart = Math.max(0, topFirst.length - MAX_STACKED)
  const getStartShowing = (start: number) =>
    Math.min(lastStart, Math.max(0, shownIndex - MAX_STACKED + 1, Math.min(start, shownIndex)))
  const [start, setStart] = useState(() => getStartShowing(0))
  // Another floor shown (a press, the arrow keys, a desk on another floor): into view.
  const [followedFloor, setFollowedFloor] = useState(currentFloor)
  if (followedFloor !== currentFloor) {
    setFollowedFloor(currentFloor)
    setStart(getStartShowing(start))
  }

  const shownStart = Math.min(start, lastStart)

  return {
    stacked: topFirst.slice(shownStart, shownStart + MAX_STACKED),
    isScrolling: topFirst.length > MAX_STACKED,
    canScrollUp: shownStart > 0,
    canScrollDown: shownStart < lastStart,
    scrollUp: () => setStart(Math.max(0, shownStart - 1)),
    scrollDown: () => setStart(Math.min(lastStart, shownStart + 1)),
  }
}

/** What a floor is called: its name, or (unnamed) "Floor 2". */
export const useFloorName = () => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)

  return (floor: Floor) =>
    floor.name || t("Floor {number}", { number: getFloorNumber(floors, floor.id) })
}

/**
 * The layout's floors as a stack of slabs, the top floor on top: the shown
 * one in the accent, another a press away. Editing: a panel of its own, with
 * a ghost slab on top to add a floor there and the floors' menu (names,
 * order, delete) below. Viewing (only with floors to choose from): the top of
 * the map's controls bar (see MapControls) — slabs and numbers, and, as the
 * bar opens, each floor's name and the modules' word on it (the office: "6
 * free"). A phone has its own, see FloorChip.
 */
export const FloorPicker = ({ isEditing = false }: { isEditing?: boolean }) => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const showFloor = useEditorStore((state) => state.showFloor)
  const addFloor = useEditorStore((state) => state.addFloor)
  const getFloorName = useFloorName()
  const floorNotes = useFloorNotes()
  const stack = useStackedFloors(floors, currentFloor)
  if (!isEditing && floors.length < 2) return null

  return (
    <div
      className={clsx(
        "pointer-events-auto flex flex-col items-stretch",
        isEditing && "rounded-2xl border border-border bg-overlay p-1.5 shadow-overlay"
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {isEditing && floors.length < MAX_FLOORS && (
        <button
          type="button"
          aria-label={t("Add a floor on top")}
          title={t("Add a floor on top")}
          onClick={addFloor}
          className="group flex items-center gap-2 rounded-lg pr-2 text-muted outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Slab look="ghost" />
          <Plus className="size-3.5" />
        </button>
      )}
      {stack.isScrolling && (
        <ScrollArrow
          label={t("Show the floors above")}
          isDisabled={!stack.canScrollUp}
          onPress={stack.scrollUp}
        >
          <ChevronUp className="size-3.5" />
        </ScrollArrow>
      )}
      <div
        role="radiogroup"
        aria-label={t("Choose a floor")}
        className="flex flex-col"
        // Up and down move a floor (the stack's top is the top floor).
        onKeyDown={(event) => {
          const step = { ArrowUp: 1, ArrowDown: -1 }[event.key]
          if (!step) return

          event.preventDefault()
          const index = floors.findIndex((floor) => floor.id === currentFloor)
          const next = floors[index + step]
          if (!next) return

          showFloor(next.id)
          // The focus goes with it (the shown floor is the one in the tab order).
          const group = event.currentTarget
          requestAnimationFrame(() =>
            group.querySelector<HTMLElement>("[aria-checked=true]")?.focus()
          )
        }}
      >
        {stack.stacked.map((floor) => {
          const isShown = floor.id === currentFloor
          const note = isEditing ? undefined : floorNotes?.get(floor.id)

          return (
            <button
              key={floor.id}
              type="button"
              role="radio"
              aria-checked={isShown}
              tabIndex={isShown ? 0 : -1}
              aria-label={composeFloorLabel(getFloorName(floor), note)}
              title={composeFloorLabel(getFloorName(floor), note)}
              // The camera follows (see FloorShift): no refit.
              onClick={() => showFloor(floor.id)}
              className={clsx(
                "group flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus",
                isEditing ? "gap-2 pr-2" : "h-7 px-1.5 hover:bg-foreground/10"
              )}
            >
              <span className="relative shrink-0">
                <Slab look={isShown ? "shown" : "other"} isSmall={!isEditing} />
                {note?.yours && (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-success ring-2 ring-overlay" />
                )}
              </span>
              {isEditing ? (
                <span
                  className={clsx(
                    "max-w-24 truncate text-xs",
                    isShown
                      ? "font-extrabold text-accent"
                      : "font-bold text-muted group-hover:text-foreground"
                  )}
                >
                  {floor.name || getFloorNumber(floors, floor.id)}
                </span>
              ) : (
                <>
                  <span
                    className={clsx(
                      "ml-1.5 w-3 text-xs tabular-nums",
                      isShown ? "font-extrabold text-accent" : "font-bold text-muted"
                    )}
                  >
                    {getFloorNumber(floors, floor.id)}
                  </span>
                  {/* As the bar opens: its name, and the word on it. */}
                  <span className={clsx(REVEAL_LABEL, "flex items-center gap-2 text-xs")}>
                    {floor.name && (
                      <span
                        className={clsx(
                          "max-w-24 truncate",
                          isShown ? "font-extrabold text-accent" : "font-bold text-foreground"
                        )}
                      >
                        {floor.name}
                      </span>
                    )}
                    {note && (
                      <span
                        className={clsx(
                          "ml-auto font-extrabold",
                          note.tone === "positive" ? "text-success" : "text-warning"
                        )}
                      >
                        {note.text}
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
      {stack.isScrolling && (
        <ScrollArrow
          label={t("Show the floors below")}
          isDisabled={!stack.canScrollDown}
          onPress={stack.scrollDown}
        >
          <ChevronDown className="size-3.5" />
        </ScrollArrow>
      )}
      {isEditing ? (
        <FloorsMenu />
      ) : (
        <span className="mx-1.5 my-0.5 h-px bg-separator" aria-hidden />
      )}
    </div>
  )
}

/** Scrolls the stack a floor up or down (more floors than it shows). */
const ScrollArrow = ({
  label,
  isDisabled,
  onPress,
  children,
}: {
  label: string
  isDisabled: boolean
  onPress: () => void
  children: ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={isDisabled}
    onClick={onPress}
    className="flex h-5 items-center justify-center rounded-md text-muted outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-30 disabled:hover:bg-transparent"
  >
    {children}
  </button>
)

/** A floor's name, for assistive tech and its tooltip: with its note, and what of yours is there. */
export const composeFloorLabel = (name: string, note: FloorNote | undefined) =>
  [name, note?.text, note?.yours].filter(Boolean).join(", ")

/**
 * A floor drawn as a flat slab seen from above at an angle — stacked, they
 * read as the building. `ghost`: dashed, a floor that could be added.
 */
export const Slab = ({
  look,
  isSmall = false,
}: {
  look: "shown" | "other" | "ghost"
  /** Icon-sized, for a bar of icons. */
  isSmall?: boolean
}) => (
  <svg
    aria-hidden
    viewBox="0 0 44 20"
    className={clsx("shrink-0 overflow-visible", isSmall ? "h-3.5 w-[30px]" : "h-5 w-11")}
  >
    {/* The edge: the slab's thickness, under its top. */}
    <path
      d="M2 9 L22 16 L42 9 L42 12 L22 19 L2 12 Z"
      className={clsx(
        look === "shown" && "fill-accent/70",
        look === "other" && "fill-border group-hover:fill-accent/40",
        look === "ghost" && "fill-none"
      )}
    />
    <path
      d="M22 2 L42 9 L22 16 L2 9 Z"
      strokeWidth={1.25}
      strokeLinejoin="round"
      strokeDasharray={look === "ghost" ? "3 2.5" : undefined}
      className={clsx(
        look === "shown" && "fill-accent stroke-accent",
        look === "other" && "fill-surface stroke-border group-hover:stroke-accent",
        look === "ghost" && "fill-none stroke-current"
      )}
    />
  </svg>
)

/** Editing: the floors' menu — a new one on top, and each named, moved or deleted. */
const FloorsMenu = () => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const addFloor = useEditorStore((state) => state.addFloor)
  const canAdd = floors.length < MAX_FLOORS

  return (
    <Popover>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={t("Edit floors")}
        className="mt-1 h-8 w-full min-w-8 rounded-lg"
      >
        <Pencil className="size-4" />
      </Button>
      <Popover.Content placement="left" className="rounded-2xl">
        <Popover.Dialog aria-label={t("The office's floors")} className="w-80 p-2 outline-none">
          <p className="px-1 pb-2 pt-1 text-xs font-extrabold text-muted">
            {t("The office's floors")}
          </p>
          <ul className="flex flex-col gap-1">
            {[...floors].reverse().map((floor, index) => (
              <FloorRow
                key={floor.id}
                floor={floor}
                isTop={index === 0}
                isBottom={index === floors.length - 1}
                isOnly={floors.length === 1}
              />
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={!canAdd}
            className="mt-2 w-full justify-start rounded-xl"
            onPress={addFloor}
          >
            <Plus className="size-4" />
            {t("Add a floor on top")}
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** What a floor's "…" menu offers. */
type FloorAction = "add-walled" | "add-empty" | "move-up" | "move-down" | "delete"

/**
 * A floor in the menu: its number and name to edit, how much is on it, and
 * its "…" menu — a floor above (with its outer walls, or empty), up and
 * down, delete.
 */
const FloorRow = ({
  floor,
  isTop,
  isBottom,
  isOnly,
}: {
  floor: Floor
  isTop: boolean
  isBottom: boolean
  isOnly: boolean
}) => {
  const { t, tn } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const isShown = useEditorStore((state) => state.currentFloor === floor.id)
  const renameFloor = useEditorStore((state) => state.renameFloor)
  const addFloorAbove = useEditorStore((state) => state.addFloorAbove)
  const moveFloor = useEditorStore((state) => state.moveFloor)
  const deleteFloor = useEditorStore((state) => state.deleteFloor)
  // What's on it: deleting an empty floor asks nothing.
  const pieceCount = useEditorStore((state) =>
    floor.id === state.currentFloor
      ? state.objects.length
      : [...state.otherFloorsPieces, ...state.keptPieces].filter(
          (piece) => getFloorId(piece, state.floors) === floor.id
        ).length
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const placeholder = t("Floor {number}", { number: getFloorNumber(floors, floor.id) })
  const name = floor.name || placeholder
  const isFull = floors.length >= MAX_FLOORS
  const disabledActions: FloorAction[] = [
    ...(isFull ? (["add-walled", "add-empty"] as const) : []),
    ...(isTop ? (["move-up"] as const) : []),
    ...(isBottom ? (["move-down"] as const) : []),
    ...(isOnly ? (["delete"] as const) : []),
  ]

  const handleAction = (action: FloorAction) => {
    switch (action) {
      case "add-walled":
        return addFloorAbove(floor.id, true)
      case "add-empty":
        return addFloorAbove(floor.id, false)
      case "move-up":
        return moveFloor(floor.id, 1)
      case "move-down":
        return moveFloor(floor.id, -1)
      case "delete":
        return pieceCount > 0 ? setIsConfirming(true) : deleteFloor(floor.id)
    }
  }

  return (
    <li
      className={clsx(
        "flex items-center gap-2 rounded-xl border p-1.5",
        isShown ? "border-accent/30 bg-accent/10" : "border-transparent"
      )}
    >
      <label className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={clsx(
            "px-1 text-[11px] font-extrabold",
            isShown ? "text-accent" : "text-muted"
          )}
        >
          {placeholder}
        </span>
        <input
          // Keyed by name, so a name put back (undo, reorder) shows.
          key={floor.name}
          defaultValue={floor.name}
          placeholder={placeholder}
          aria-label={t("Name of {floor}", { floor: name })}
          maxLength={MAX_FLOOR_NAME}
          onBlur={(event) => renameFloor(floor.id, event.currentTarget.value)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className="h-8 min-w-0 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </label>
      <span className="w-16 shrink-0 self-end pb-2 text-right text-xs font-bold text-muted">
        {tn(pieceCount, "{n} item", "{n} items")}
      </span>
      <Dropdown>
        <Dropdown.Trigger
          aria-label={t("More for {floor}", { floor: name })}
          className="grid size-8 shrink-0 place-items-center self-end rounded-lg text-muted outline-none hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Ellipsis className="size-4" />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={name}
            disabledKeys={disabledActions}
            onAction={(action) => handleAction(action as FloorAction)}
          >
            <Dropdown.Item
              id="add-walled"
              textValue={t("Add a floor above, with these outer walls")}
            >
              <BrickWall className="size-4 text-muted" />
              {t("Add a floor above, with these outer walls")}
            </Dropdown.Item>
            <Dropdown.Item id="add-empty" textValue={t("Add an empty floor above")}>
              <Plus className="size-4 text-muted" />
              {t("Add an empty floor above")}
            </Dropdown.Item>
            <Dropdown.Item id="move-up" textValue={t("Move up")}>
              <ChevronUp className="size-4 text-muted" />
              {t("Move up")}
            </Dropdown.Item>
            <Dropdown.Item id="move-down" textValue={t("Move down")}>
              <ChevronDown className="size-4 text-muted" />
              {t("Move down")}
            </Dropdown.Item>
            <Dropdown.Item id="delete" textValue={t("Delete floor")} variant="danger">
              <Trash2 className="size-4" />
              {t("Delete floor")}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <AlertDialog isOpen={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }: { close: () => void }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      {t("Delete {floor}?", { floor: name })}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    {tn(
                      pieceCount,
                      "Its {n} item goes with it. This can't be undone.",
                      "All {n} items on it go with it. This can't be undone."
                    )}
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      {t("Cancel")}
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => {
                        deleteFloor(floor.id)
                        close()
                      }}
                    >
                      {t("Delete floor")}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </li>
  )
}
