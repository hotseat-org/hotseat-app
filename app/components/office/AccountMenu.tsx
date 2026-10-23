import { useState } from "react"
import { Popover } from "@heroui/react"
import { Cog, LogOut, Users } from "lucide-react"
import { useNavigate } from "react-router"
import { MemberAvatar, PANEL, PANEL_HOVER, nameOf, type ShellMember } from "./shell-ui"
import { useProfile } from "~/utils/remix"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { ThemeSwitcher } from "~/components/ui/ThemeSwitcher"

const item =
  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5"

/**
 * Avatar menu: user settings, org settings, log out. `isFlat`: no panel of its
 * own, for a bar that already is one (the phone's top bar).
 */
export const AccountMenu = ({ isFlat = false }: { isFlat?: boolean }) => {
  const profile = useProfile()
  const me: ShellMember = {
    userEmail: profile.userEmail,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: String(profile.role),
  }
  const { open: openSettings } = useSettings()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const act = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <div
          role="button"
          tabIndex={0}
          aria-label="Account menu"
          className={`${isFlat ? "pointer-events-auto rounded-xl" : `${PANEL} ${PANEL_HOVER} p-1.5`} flex cursor-pointer items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-focus`}
        >
          <MemberAvatar m={me} className="size-9 rounded-xl" />
        </div>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="rounded-lg">
        <Popover.Dialog className="w-56 p-1">
          <div className="flex items-center gap-2 px-2 pb-2 pt-1">
            <MemberAvatar m={me} className="size-8 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-5">{nameOf(me)}</p>
              <p className="truncate text-xs leading-none text-muted">{me.userEmail}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-separator px-2 py-2">
            <span className="text-sm">Dark mode</span>
            <ThemeSwitcher />
          </div>
          <div className="flex flex-col border-t border-separator pt-1">
            <button
              type="button"
              onClick={() => act(() => openSettings("user", "profile"))}
              className={item}
            >
              User settings <Cog className="size-3.5 text-muted" />
            </button>
            {/* Organization settings are an admin's. */}
            {profile.role === Role.ADMIN && (
              <button
                type="button"
                onClick={() => act(() => openSettings("org", "general"))}
                className={item}
              >
                Organization <Users className="size-3.5 text-muted" />
              </button>
            )}
            <button
              type="button"
              onClick={() => act(() => navigate("/logout"))}
              className={`${item} text-danger`}
            >
              Log out <LogOut className="size-3.5" />
            </button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
