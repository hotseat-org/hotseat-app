import { useState } from "react"
import { Popover } from "@heroui/react"
import clsx from "clsx"
import { Building2, ChevronRight, LogOut, Settings, type LucideIcon } from "lucide-react"
import { useNavigate } from "react-router"
import { MemberAvatar, PANEL, PANEL_HOVER, nameOf, type ShellMember } from "./shell-ui"
import type { DayStatus } from "./dayStatus"
import { useProfile } from "~/utils/remix"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { ThemeModeControl } from "~/components/ui/ThemeModeControl"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The avatar's menu: who you are, the theme, your settings and (admins) the
 * organization's, and logging out. A popover by the avatar; on a phone, a
 * sheet like the app's other phone dialogs. `isFlat`: no panel round the
 * avatar, for a bar that already is one (the phone's top bar). `day` (an
 * office, desktop): your day beside the avatar, and on top of the menu with
 * what to do about it.
 */
export const AccountMenu = ({ isFlat = false, day }: { isFlat?: boolean; day?: DayStatus }) => {
  const profile = useProfile()
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const me: ShellMember = {
    userEmail: profile.userEmail,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: String(profile.role),
  }
  const trigger = (
    <div
      role="button"
      tabIndex={0}
      aria-label={day ? `${t("Account menu")}: ${day.text}` : t("Account menu")}
      className={`${isFlat ? "pointer-events-auto rounded-xl" : `${PANEL} ${PANEL_HOVER} h-11 p-[5px]`} flex cursor-pointer items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-focus`}
    >
      {day && !isMobile && (
        <span className="flex min-w-0 max-w-56 items-center gap-1.5 pl-2 text-sm font-bold text-foreground">
          <day.icon className="size-4 shrink-0 text-muted" />
          <span className="truncate">{day.text}</span>
        </span>
      )}
      {/* The top bar's height (h-11, as search and the bell); its corners follow the panel's. */}
      <MemberAvatar m={me} className={isFlat ? "size-9 rounded-xl" : "size-8 rounded-[10px]"} />
    </div>
  )

  if (isMobile)
    return (
      <>
        <div
          onClick={() => setIsOpen(true)}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setIsOpen(true)}
        >
          {trigger}
        </div>
        {isOpen && (
          <BottomSheet label={t("Account menu")} onClose={() => setIsOpen(false)}>
            {(close) => (
              <AccountContent me={me} isAdmin={profile.role === Role.ADMIN} onDone={close} />
            )}
          </BottomSheet>
        )}
      </>
    )

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content placement="bottom end" className="rounded-2xl">
        <Popover.Dialog className="w-72 p-2 outline-none">
          <AccountContent
            me={me}
            day={day}
            isAdmin={profile.role === Role.ADMIN}
            onDone={() => setIsOpen(false)}
          />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** What the menu holds, in the popover or the sheet. `onDone` closes it before acting. */
const AccountContent = ({
  me,
  day,
  isAdmin,
  onDone,
}: {
  me: ShellMember
  day?: DayStatus
  isAdmin: boolean
  onDone: () => void
}) => {
  const { t } = useI18n()
  const { open: openSettings } = useSettings()
  const navigate = useNavigate()
  const act = (action: () => void) => () => {
    onDone()
    action()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 px-2 pb-1 pt-2">
        <MemberAvatar m={me} className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-foreground">{nameOf(me)}</p>
          <p className="truncate text-xs text-muted">{me.userEmail}</p>
        </div>
      </div>

      {day && (
        // Any of its actions closes the menu: the map (or a panel) has it.
        <div className="flex flex-col gap-1 rounded-xl bg-accent/10 px-3 py-2.5" onClick={onDone}>
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
            <day.icon className="size-4 shrink-0 text-accent" />
            {day.text}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">{day.actions}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
        <span className="text-sm font-bold text-foreground">{t("Theme")}</span>
        <ThemeModeControl isCompact />
      </div>

      <ul className="overflow-hidden rounded-xl bg-surface">
        <AccountRow
          icon={Settings}
          label={t("Your settings")}
          onPress={act(() => openSettings("user"))}
        />
        {/* Organization settings are an admin's. */}
        {isAdmin && (
          <AccountRow
            icon={Building2}
            label={t("Organization settings")}
            onPress={act(() => openSettings("org"))}
          />
        )}
      </ul>

      <ul className="overflow-hidden rounded-xl bg-surface">
        <AccountRow
          icon={LogOut}
          label={t("Log out")}
          isDanger
          onPress={act(() => navigate("/logout"))}
        />
      </ul>
    </div>
  )
}

/** A row of the menu: its icon, what it does, and (opening a page) a chevron. */
const AccountRow = ({
  icon: Icon,
  label,
  isDanger = false,
  onPress,
}: {
  icon: LucideIcon
  label: string
  isDanger?: boolean
  onPress: () => void
}) => (
  <li className="border-b border-separator last:border-b-0">
    <button
      type="button"
      onClick={onPress}
      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-foreground/5 active:bg-foreground/5"
    >
      <span
        className={clsx(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          isDanger ? "bg-danger/10 text-danger" : "bg-accent/12 text-accent"
        )}
      >
        <Icon className="size-4" />
      </span>
      <span
        className={clsx(
          "min-w-0 flex-1 truncate text-sm font-bold",
          isDanger ? "text-danger" : "text-foreground"
        )}
      >
        {label}
      </span>
      {!isDanger && <ChevronRight className="size-4 shrink-0 text-muted" />}
    </button>
  </li>
)
