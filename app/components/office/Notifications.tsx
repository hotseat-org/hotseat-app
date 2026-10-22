import { Popover } from "@heroui/react"
import clsx from "clsx"
import { Bell } from "lucide-react"
import { useState } from "react"
import { Link, useFetcher } from "react-router"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
const ago = (when: Date | string) => {
  const minutes = Math.round((Date.now() - new Date(when).getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`
  return `${Math.round(minutes / 60 / 24)} d ago`
}

/**
 * The bell: what other people's changes did to you (a cancelled booking, a
 * permanent desk given or taken, a deleted office). A dot while any is
 * unread; opening it marks them read — those stay highlighted until it closes.
 */
export const NotificationsBell = ({ triggerClassName }: { triggerClassName: string }) => {
  const { notifications } = useOrganizationContext()
  const markRead = useFetcher()
  // Unread at the moment it opened (the list refreshes as read meanwhile).
  const [wasUnread, setWasUnread] = useState<Set<string>>(new Set())
  const hasUnread = notifications.unread > 0

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) return setWasUnread(new Set())
    setWasUnread(new Set(notifications.items.filter((n) => !n.readAt).map((n) => n.id)))
    if (hasUnread) markRead.submit(null, { method: "POST", action: "/api/notifications" })
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <Popover.Trigger
        aria-label={hasUnread ? `Notifications, ${notifications.unread} unread` : "Notifications"}
        className={clsx("relative", triggerClassName)}
      >
        <Bell className="size-5" />
        {hasUnread && (
          <span className="absolute right-2 top-2 size-2.5 rounded-full bg-danger ring-2 ring-surface" />
        )}
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="rounded-xl">
        <Popover.Dialog className="w-80 max-w-[calc(100vw-24px)] p-1.5 outline-none">
          {notifications.items.length === 0 ? (
            <div className="p-3 text-center">
              <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
              <p className="mt-0.5 text-xs text-muted">
                Changes to your bookings or desk show up here.
              </p>
            </div>
          ) : (
            <ul className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
              {notifications.items.map((n) => {
                const body = (
                  <>
                    <p className="text-sm text-foreground">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted">{ago(n.createdAt)}</p>
                  </>
                )
                const className = clsx(
                  "block rounded-lg px-3 py-2.5",
                  wasUnread.has(n.id) && "bg-accent/10",
                  n.link && "hover:bg-foreground/5"
                )
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link to={n.link} className={className}>
                        {body}
                      </Link>
                    ) : (
                      <div className={className}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
