import { AlertDialog, Button, Popover } from "@heroui/react"
import clsx from "clsx"
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { MAX_FLOORS, MAX_FLOOR_NAME, getFloorId, getFloorNumber, type Floor } from "../../floors"
import { useEditorStore } from "../../store"
import { useI18n } from "~/i18n/I18nProvider"

/** What a floor is called: its name, or (unnamed) "Floor 2". */
export const useFloorName = () => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)

  return (floor: Floor) =>
    floor.name || t("Floor {number}", { number: getFloorNumber(floors, floor.id) })
}

/**
 * The layout's floors: one is shown, another a press away. Viewing, a column
 * with the top floor on top — only with floors to choose from. Editing, a row
 * in the top bar (the catalogue has the left), from the bottom floor, always
 * there, with the floors' own menu (add, name, order, delete). `isPhone`: in
 * the phone shell's colours.
 */
export const FloorPicker = ({
  isEditing = false,
  isPhone = false,
}: {
  isEditing?: boolean
  isPhone?: boolean
}) => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const showFloor = useEditorStore((state) => state.showFloor)
  const requestFit = useEditorStore((state) => state.requestFit)
  const getFloorName = useFloorName()
  if (!isEditing && floors.length < 2) return null

  const pick = (id: string) => {
    showFloor(id)
    // Floors differ: each fits the view its own way.
    requestFit()
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("Choose a floor")}
      className={clsx(
        "pointer-events-auto flex gap-0.5 p-1 shadow-overlay",
        isEditing ? "flex-row items-center" : "flex-col",
        isPhone
          ? "rounded-xl border border-chrome-border bg-chrome/95"
          : "rounded-2xl border border-border bg-overlay"
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {(isEditing ? floors : [...floors].reverse()).map((floor) => {
        const isShown = floor.id === currentFloor

        return (
          <button
            key={floor.id}
            type="button"
            role="radio"
            aria-checked={isShown}
            aria-label={getFloorName(floor)}
            title={getFloorName(floor)}
            onClick={() => pick(floor.id)}
            className={clsx(
              "h-9 min-w-9 max-w-28 truncate rounded-xl px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
              isShown
                ? "bg-accent font-extrabold text-accent-foreground"
                : "font-bold text-foreground hover:bg-foreground/10"
            )}
          >
            {floor.name || getFloorNumber(floors, floor.id)}
          </button>
        )
      })}
      {isEditing && <FloorsMenu />}
    </div>
  )
}

/** Editing: the floors' menu — a new one on top, and each named, moved or deleted. */
const FloorsMenu = () => {
  const { t } = useI18n()
  const floors = useEditorStore((state) => state.floors)
  const addFloor = useEditorStore((state) => state.addFloor)
  const requestFit = useEditorStore((state) => state.requestFit)
  const canAdd = floors.length < MAX_FLOORS

  return (
    <Popover>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={t("Edit floors")}
        className="size-9 min-w-9 rounded-xl"
      >
        <Pencil className="size-4" />
      </Button>
      <Popover.Content placement="bottom start" className="rounded-2xl">
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
            onPress={() => {
              addFloor()
              requestFit()
            }}
          >
            <Plus className="size-4" />
            {t("Add a floor on top")}
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** A floor in the menu: its name to edit, up and down, and delete. */
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
  const renameFloor = useEditorStore((state) => state.renameFloor)
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

  return (
    <li className="flex items-center gap-1">
      <input
        // Keyed by name, so a name put back (undo, reorder) shows.
        key={floor.name}
        defaultValue={floor.name}
        placeholder={placeholder}
        aria-label={t("Name of {floor}", { floor: floor.name || placeholder })}
        maxLength={MAX_FLOOR_NAME}
        onBlur={(event) => renameFloor(floor.id, event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={t("Move up")}
        isDisabled={isTop}
        onPress={() => moveFloor(floor.id, 1)}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={t("Move down")}
        isDisabled={isBottom}
        onPress={() => moveFloor(floor.id, -1)}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label={t("Delete {floor}", { floor: floor.name || placeholder })}
        isDisabled={isOnly}
        className="text-danger"
        onPress={() => (pieceCount > 0 ? setIsConfirming(true) : deleteFloor(floor.id))}
      >
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog isOpen={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }: { close: () => void }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>
                      {t("Delete {floor}?", { floor: floor.name || placeholder })}
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
