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
 * The layout's floors as a stack of slabs, the top floor on top: the shown
 * one in the accent, another a press away. Viewing, only with floors to
 * choose from. Editing, always — with a ghost slab on top to add a floor
 * there, and the floors' menu (names, order, delete) below. `isPhone`: in the
 * phone shell's colours.
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
  const addFloor = useEditorStore((state) => state.addFloor)
  const getFloorName = useFloorName()
  if (!isEditing && floors.length < 2) return null

  return (
    <div
      className={clsx(
        "pointer-events-auto flex flex-col items-stretch p-1.5 shadow-overlay",
        isPhone
          ? "rounded-xl border border-chrome-border bg-chrome/95"
          : "rounded-2xl border border-border bg-overlay"
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
      <div role="radiogroup" aria-label={t("Choose a floor")} className="flex flex-col">
        {[...floors].reverse().map((floor) => {
          const isShown = floor.id === currentFloor

          return (
            <button
              key={floor.id}
              type="button"
              role="radio"
              aria-checked={isShown}
              aria-label={getFloorName(floor)}
              title={getFloorName(floor)}
              // The camera follows (see FloorShift): no refit.
              onClick={() => showFloor(floor.id)}
              className="group flex items-center gap-2 rounded-lg pr-2 outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Slab look={isShown ? "shown" : "other"} />
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
            </button>
          )
        })}
      </div>
      {isEditing && <FloorsMenu />}
    </div>
  )
}

/**
 * A floor drawn as a flat slab seen from above at an angle — stacked, they
 * read as the building. `ghost`: dashed, a floor that could be added.
 */
const Slab = ({ look }: { look: "shown" | "other" | "ghost" }) => (
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
