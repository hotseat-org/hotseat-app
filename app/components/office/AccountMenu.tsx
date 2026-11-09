import { useState } from "react"
import { Popover } from "@heroui/react"
import clsx from "clsx"
import { useNavigate } from "react-router"
import { MemberAvatar, PANEL, nameOf, type ShellMember } from "./shell-ui"
import type { DayStatus } from "./dayStatus"
import { useProfile } from "~/utils/remix"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { ColumnPage } from "~/components/office/ColumnPage"
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
export const AccountMenu = ({
  isFlat = false,
  day,
  column,
}: {
  isFlat?: boolean
  day?: DayStatus
  /** In an office (desktop): the menu is a page in its left column, opened and closed there. */
  column?: { isOpen: boolean; onToggle: () => void }
}) => {
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
  const triggerLabel = day ? `${t("Account menu")}: ${day.text}` : t("Account menu")
  const triggerClassName = `${isFlat ? "pointer-events-auto rounded-xl" : `${PANEL} h-11 rounded-full p-0.5`} flex cursor-pointer items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-focus`
  const triggerContent = (
    <>
      {day && !isMobile && (
        <span className="flex min-w-0 max-w-56 items-center gap-1.5 pl-2 text-sm font-bold text-foreground">
          <day.icon className="size-4 shrink-0 text-muted" />
          <span className="truncate">{day.text}</span>
        </span>
      )}
      {/* The top bar's height (h-11, as search and the bell); its corners follow the panel's. */}
      <MemberAvatar m={me} className={isFlat ? "size-9 rounded-xl" : "size-10 rounded-full"} />
    </>
  )

  if (column && !isMobile)
    return (
      <button
        type="button"
        aria-label={triggerLabel}
        aria-expanded={column.isOpen}
        className={triggerClassName}
        onClick={column.onToggle}
      >
        {triggerContent}
      </button>
    )

  if (isMobile)
    return (
      <>
        <button
          type="button"
          aria-label={triggerLabel}
          className={triggerClassName}
          onClick={() => setIsOpen(true)}
        >
          {triggerContent}
        </button>
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
      {/* The trigger is the button itself: one tab stop, no button inside a button. */}
      <Popover.Trigger aria-label={triggerLabel} className={triggerClassName}>
        {triggerContent}
      </Popover.Trigger>
      <Popover.Content placement="bottom end" offset={10} className="rounded-[32px]">
        <Popover.Dialog className="w-[360px] px-5 pt-6 pb-3 outline-none">
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

/** The account as a page in the office's left column: your name the headline. */
export const AccountPage = ({ onClose }: { onClose: () => void }) => {
  const profile = useProfile()
  const { t } = useI18n()
  const me: ShellMember = {
    userEmail: profile.userEmail,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: String(profile.role),
  }

  return (
    <ColumnPage
      label={t("Account menu")}
      side="right"
      title={nameOf(me)}
      summary={me.userEmail}
      onClose={onClose}
    >
      <AccountContent
        me={me}
        isAdmin={profile.role === Role.ADMIN}
        hasName={false}
        onDone={onClose}
      />
    </ColumnPage>
  )
}

/** What the menu holds, in the popover, the sheet or the page. `onDone` closes it before acting. */
const AccountContent = ({
  me,
  day,
  isAdmin,
  hasName = true,
  onDone,
}: {
  me: ShellMember
  day?: DayStatus
  isAdmin: boolean
  /** Its own name on top (none where the page's headline says it). */
  hasName?: boolean
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
    // The headline's menu: your name in large type, then ruled words.
    <div className="flex flex-col">
      {hasName && (
        <div className="px-1 pb-4">
          <p className="truncate text-[32px] leading-none font-black tracking-[-0.03em] text-foreground">
            {nameOf(me)}
          </p>
          <p className="mt-1.5 truncate text-[15px] font-bold text-muted">{me.userEmail}</p>
        </div>
      )}

      {day && (
        // Any of its actions closes the menu: the map (or a panel) has it.
        <div className="border-t border-separator px-1 py-3" onClick={onDone}>
          <p className="text-base font-extrabold text-foreground">{day.text}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
            {day.actions}
          </p>
        </div>
      )}

      <ul>
        <AccountRow label={t("Your settings")} onPress={act(() => openSettings("user"))} />
        {/* Organization settings are an admin's. */}
        {isAdmin && (
          <AccountRow label={t("Organization settings")} onPress={act(() => openSettings("org"))} />
        )}
      </ul>

      <div className="flex min-h-14 flex-wrap items-center gap-x-4 border-t border-separator px-1">
        <span className="flex-1 text-[15px] font-bold text-muted">{t("Theme")}</span>
        <ThemeModeControl isWords />
      </div>

      <ul>
        <AccountRow label={t("Log out")} isDanger onPress={act(() => navigate("/logout"))} />
      </ul>
    </div>
  )
}

/** A line of the menu: what it does, as a word in large type. */
const AccountRow = ({
  label,
  isDanger = false,
  onPress,
}: {
  label: string
  isDanger?: boolean
  onPress: () => void
}) => (
  <li className="border-t border-separator">
    <button
      type="button"
      onClick={onPress}
      className={clsx(
        "flex min-h-15 w-full items-center px-1 text-left text-xl font-extrabold outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-focus",
        isDanger ? "text-danger" : "text-foreground"
      )}
    >
      {label}
    </button>
  </li>
)
