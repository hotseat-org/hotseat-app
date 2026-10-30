import { Button, Kbd } from "@heroui/react"
import clsx from "clsx"
import { Check, LayoutTemplate, SquareDashedMousePointer } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { composeKit, useKitLibrary } from "../../kits/kits"
import { furnitureInRoomAt } from "../../layout"
import { useEditorStore, useEditorStoreApi, type EditorState } from "../../store"
import { useModules } from "../../modules"
import { EDIT_COMMANDS, SELECTION_COMMANDS, VIEW_COMMANDS, type Command } from "./commands"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

/** Kept this far (px) from the window's edges. */
const EDGE_GAP = 8

type Menu = NonNullable<EditorState["contextMenu"]>

/** The floor menu's "this room": the room under the pointer, not the selection's. */
const selectRoomAt = (menu: Menu): Command => ({
  id: "selectRoomHere",
  label: msg("Select everything in this room"),
  group: msg("Selection"),
  icon: SquareDashedMousePointer,
  isAvailable: (state) => furnitureInRoomAt(state.objects, menu.point.x, menu.point.z).length > 0,
  run: (state) => {
    state.setTool("select")
    state.selectMany(furnitureInRoomAt(state.objects, menu.point.x, menu.point.z))
  },
})

/** Save the room under the pointer as a kit (named first, in the menu). */
const SAVE_ROOM_ID = "saveRoom"
const saveRoomAt = (menu: Menu): Command => ({
  id: SAVE_ROOM_ID,
  label: msg("Save this room…"),
  group: msg("Edit"),
  icon: LayoutTemplate,
  isAvailable: (state) => !!composeKit(state.objects, menu.point.x, menu.point.z),
  run: () => {},
})

/** How long "Saved" shows before the menu closes (ms). */
const SAVED_FOR = 1600

/** What a right-click offers: the selection's actions on a piece, the room's on the floor. */
const commandsFor = (menu: Menu, moduleCommands: Command[]): Command[] =>
  menu.targetId
    ? [...SELECTION_COMMANDS, saveRoomAt(menu)]
    : [
        selectRoomAt(menu),
        saveRoomAt(menu),
        ...[...EDIT_COMMANDS, ...moduleCommands, ...VIEW_COMMANDS].filter(
          (command) => command.isOnFloorMenu
        ),
      ]

/**
 * The right-click menu: on a piece (it's selected first), what can be done to
 * the selection; on the floor, pasting and the room / office-wide actions.
 * Arrow keys move through it, Enter runs, Esc or a click elsewhere closes it.
 */
export const ContextMenu = () => {
  const menu = useEditorStore((state) => state.contextMenu)
  if (!menu) return null

  // A new menu (another right-click) starts fresh: focus, position.
  return <ContextMenuPanel key={`${menu.x},${menu.y}`} menu={menu} />
}

const ContextMenuPanel = ({ menu }: { menu: Menu }) => {
  const { t } = useI18n()
  const store = useEditorStoreApi()
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: menu.x, top: menu.y })
  const [step, setStep] = useState<"menu" | "naming" | "saved">("menu")
  const close = () => store.getState().closeContextMenu()
  const moduleCommands = useModules().flatMap((module) => module.commands ?? [])
  const commands = commandsFor(menu, moduleCommands).filter((command) =>
    command.isAvailable(store.getState())
  )

  // Opens towards the window's middle when it wouldn't fit at the pointer.
  useLayoutEffect(() => {
    const element = menuRef.current
    const parent = element?.offsetParent?.getBoundingClientRect()
    if (!element || !parent) return

    const { width, height } = element.getBoundingClientRect()
    const x = menu.x - parent.left
    const y = menu.y - parent.top
    setPosition({
      left: x + width + EDGE_GAP > parent.width ? Math.max(EDGE_GAP, x - width) : x,
      top: y + height + EDGE_GAP > parent.height ? Math.max(EDGE_GAP, y - height) : y,
    })
    element.querySelector<HTMLElement>("[role=menuitem]")?.focus()
  }, [menu, step])

  // A press anywhere else, the wheel, or the window losing focus closes it.
  useEffect(() => {
    const handlePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close()
    }
    window.addEventListener("pointerdown", handlePress, true)
    window.addEventListener("wheel", close, { passive: true })
    window.addEventListener("blur", close)

    return () => {
      window.removeEventListener("pointerdown", handlePress, true)
      window.removeEventListener("wheel", close)
      window.removeEventListener("blur", close)
    }
  })

  useEffect(() => {
    if (step !== "saved") return

    const timer = window.setTimeout(close, SAVED_FOR)

    return () => window.clearTimeout(timer)
  }, [step])

  const run = (command: Command) => {
    if (command.id === SAVE_ROOM_ID) return setStep("naming")

    close()
    command.run(store.getState())
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    // The editor's own shortcuts (arrows nudge, Esc deselects) stay out of it.
    event.stopPropagation()
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault()

      return close()
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    }
    if (event.key === "Home") items[0]?.focus()
    if (event.key === "End") items[items.length - 1]?.focus()
  }

  if (commands.length === 0) return null
  if (step !== "menu")
    return (
      <div
        ref={menuRef}
        style={position}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Escape") close()
        }}
        className="pointer-events-auto absolute z-40 w-64 rounded-xl border border-border bg-overlay/95 p-2.5 text-foreground shadow-overlay backdrop-blur-md"
      >
        {step === "naming" ? (
          <SaveRoomForm menu={menu} onSaved={() => setStep("saved")} onCancel={close} />
        ) : (
          <p role="status" className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} />
            <span>{t("Saved. Find it under Saved rooms in the catalog.")}</span>
          </p>
        )}
      </div>
    )

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={menu.targetId ? t("Selection") : t("Floor")}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      style={position}
      className="pointer-events-auto absolute z-40 min-w-56 rounded-xl border border-border bg-overlay/95 p-1 text-foreground shadow-overlay backdrop-blur-md"
    >
      {commands.map((command) => {
        const Icon = command.icon
        const isDanger = command.id === "delete"

        return (
          <button
            key={command.id}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => run(command)}
            className={clsx(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-foreground/[0.06] focus:bg-foreground/[0.06]",
              isDanger && "text-danger"
            )}
          >
            <Icon className={clsx("size-4 shrink-0", !isDanger && "text-muted")} />
            <span className="flex-1">{t(command.label)}</span>
            {command.shortcut && <Kbd className="shrink-0 text-[11px]">{command.shortcut}</Kbd>}
          </button>
        )
      })}
    </div>
  )
}

const SaveRoomForm = ({
  menu,
  onSaved,
  onCancel,
}: {
  menu: Menu
  onSaved: () => void
  onCancel: () => void
}) => {
  const { t, format } = useI18n()
  const store = useEditorStoreApi()
  const { addKit } = useKitLibrary()
  const [kit] = useState(() => composeKit(store.getState().objects, menu.point.x, menu.point.z))
  const [name, setName] = useState(() =>
    t("Room · {area} m²", { area: format.number(Math.round((kit?.area ?? 0) * 10) / 10) })
  )
  if (!kit) return null

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        addKit({ ...kit, name: name.trim() || t("Room") })
        onSaved()
      }}
      className="flex flex-col gap-2"
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        {t("Save this room as")}
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm font-normal text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-focus/40"
        />
      </label>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="tertiary" onPress={onCancel}>
          {t("Cancel")}
        </Button>
        <Button size="sm" variant="primary" type="submit">
          {t("Save")}
        </Button>
      </div>
    </form>
  )
}
