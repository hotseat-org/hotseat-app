import { AlertDialog, Button, Dropdown, Popover } from "@heroui/react"
import clsx from "clsx"
import { BrickWall, ChevronDown, ChevronUp, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import {
  MAX_FLOORS,
  MAX_FLOOR_NAME,
  getFloorId,
  getFloorNumber,
  getFloorTitle,
  type Floor,
} from "../../floors"
import { useEditorStore } from "../../store"
import type { FloorNote } from "../../module"
import { useI18n } from "~/i18n/I18nProvider"

/** What a floor is called: its name, or (unnamed) "Floor 2". */
export const useFloorName = () => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)

  return (floor: Floor) => floor.name || getFloorTitle({ t }, getFloorNumber(floors, floor.id))
}

/** A floor's name, for assistive tech and its tooltip: with its note, and what of yours is there. */
export const composeFloorLabel = (name: string, note: FloorNote | undefined) =>
  [name, note?.text, note?.yours].filter(Boolean).join(", ")

/**
 * A floor drawn as a flat slab seen from above at an angle — stacked, they
 * read as the building. `ghost`: dashed, a floor that could be added.
 */
export const Slab = ({ look }: { look: "shown" | "other" | "ghost" }) => (
  <svg aria-hidden viewBox="0 0 44 20" className="h-5 w-11 shrink-0 overflow-visible">
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

/**
 * Editing: the floors' menu, opened from its button under the tower — a new
 * floor on top, and each named, moved or deleted.
 */
export const FloorsMenu = () => {
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
        className="size-9 min-w-9 rounded-full border border-border bg-overlay shadow-overlay"
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
  const placeholder = getFloorTitle({ t }, getFloorNumber(floors, floor.id))
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
