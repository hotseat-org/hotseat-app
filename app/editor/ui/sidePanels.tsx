import { ToggleButton } from "@heroui/react"
import clsx from "clsx"
import { LayoutTemplate } from "lucide-react"
import type { CSSProperties } from "react"
import { KitsPanel } from "../kits/KitsPanel"
import type { SidePanel } from "../module"
import { useModules } from "../modules"
import { useEditorStore } from "../store"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

/** The editor's own side panels, before the modules'. */
const EDITOR_SIDE_PANELS: SidePanel[] = [
  {
    id: "kits",
    label: msg("Saved rooms"),
    icon: LayoutTemplate,
    when: "editing",
    Component: KitsPanel,
  },
]

/** A side panel offered right now, and the count on its button. */
export interface SidePanelEntry {
  panel: SidePanel
  badgeCount: number
}

const isInMode = ({ when }: SidePanel, isEditing: boolean) =>
  when === "always" || (when === "editing") === isEditing

/**
 * The side panels for the mode — the editor's, then each module's — with
 * which one is open. Each panel's hooks are called in a loop: safe, the
 * list is fixed for the editor's life (see ModulesContext).
 */
export const useSidePanels = (isEditing: boolean) => {
  const modules = useModules()
  const openId = useEditorStore((state) => state.openSidePanelId)
  const toggle = useEditorStore((state) => state.toggleSidePanel)
  const close = useEditorStore((state) => state.closeSidePanel)
  const entries: SidePanelEntry[] = [
    ...EDITOR_SIDE_PANELS,
    ...modules.flatMap((module) => module.sidePanels ?? []),
  ].flatMap((panel) => {
    const isShown = panel.useIsShown?.(isEditing) ?? true
    const badgeCount = panel.useBadgeCount?.() ?? 0

    return isShown && isInMode(panel, isEditing) ? [{ panel, badgeCount }] : []
  })
  const openPanel = entries.find((entry) => entry.panel.id === openId)?.panel ?? null

  return { entries, openPanel, toggle, close }
}

/** A side panel's button in the catalogue's rail (editing): its icon, name and count. */
export const SidePanelButton = ({
  entry,
  isOpen,
  onPress,
}: {
  entry: SidePanelEntry
  isOpen: boolean
  onPress: () => void
}) => {
  const { t } = useI18n()
  const { icon: Icon, label } = entry.panel

  return (
    <ToggleButton
      variant="ghost"
      isSelected={isOpen}
      onPress={onPress}
      className={clsx(
        "flex h-auto w-full items-center justify-start gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors",
        isOpen
          ? "bg-accent/15 text-foreground ring-2 ring-inset ring-accent"
          : "text-muted hover:bg-foreground/10 hover:text-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="flex-1 text-left">{t(label)}</span>
      {entry.badgeCount > 0 && <SidePanelBadge count={entry.badgeCount} />}
    </ToggleButton>
  )
}

/** The count on a side panel's button. */
export const SidePanelBadge = ({ count }: { count: number }) => (
  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground">
    {count}
  </span>
)

/**
 * The open side panel, beside the rail it was opened from (positioned against
 * it): its title and its content.
 */
export const SidePanelFlyout = ({
  panel,
  isEditing,
  style,
}: {
  panel: SidePanel
  isEditing: boolean
  style?: CSSProperties
}) => {
  const { t } = useI18n()
  const close = useEditorStore((state) => state.closeSidePanel)
  const { Component } = panel

  return (
    <div
      style={style}
      className="pointer-events-auto absolute left-full top-0 ml-2 flex w-60 flex-col rounded-2xl border border-border bg-overlay p-3 shadow-overlay"
    >
      <h2 className="mb-0.5 shrink-0 px-1 text-sm font-semibold text-foreground">
        {t(panel.label)}
      </h2>
      <Component isEditing={isEditing} close={close} />
    </div>
  )
}

/**
 * Viewing without an app shell (the standalone editor): the side panels'
 * own small rail, left and centred like the catalogue's; none, no rail.
 */
export const SidePanelRail = () => {
  const { entries, openPanel, toggle } = useSidePanels(false)
  if (entries.length === 0) return null

  return (
    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
      <div className="pointer-events-auto flex w-42 flex-col gap-1 rounded-2xl border border-border bg-overlay p-2 shadow-overlay">
        {entries.map((entry) => (
          <SidePanelButton
            key={entry.panel.id}
            entry={entry}
            isOpen={openPanel?.id === entry.panel.id}
            onPress={() => toggle(entry.panel.id)}
          />
        ))}
      </div>
      {openPanel && <SidePanelFlyout panel={openPanel} isEditing={false} />}
    </div>
  )
}
