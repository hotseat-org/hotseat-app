import clsx from "clsx"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useFetcher } from "react-router"
import { ColumnPage } from "./ColumnPage"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { useI18n } from "~/i18n/I18nProvider"
import { readNotification } from "~/i18n/notifications"

/** The bell in the top bar: a dot while any is unread; it opens the page below. */
export const NotificationsButton = ({
  isOpen,
  onToggle,
  className,
}: {
  isOpen: boolean
  onToggle: () => void
  className: string
}) => {
  const { notifications } = useOrganizationContext()
  const { t } = useI18n()
  const hasUnread = notifications.unread > 0

  return (
    <button
      type="button"
      aria-label={
        hasUnread ? t("Notifications, {n} unread", { n: notifications.unread }) : t("Notifications")
      }
      aria-expanded={isOpen}
      onClick={onToggle}
      className={clsx("relative", className)}
    >
      <Bell className="size-5" />
      {hasUnread && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-danger" />}
    </button>
  )
}

/** Opened: the ones unread at that moment (kept marked), and marking them read. */
const useOpenedNotifications = () => {
  const { notifications } = useOrganizationContext()
  const markRead = useFetcher()
  // Unread at the moment it opened (the list refreshes as read meanwhile).
  const [wasUnread] = useState(
    () => new Set(notifications.items.filter((item) => !item.readAt).map((item) => item.id))
  )

  useEffect(() => {
    if (notifications.unread > 0)
      markRead.submit(null, { method: "POST", action: "/api/notifications" })
    // Once, as it opens.
  }, [])

  return { items: notifications.items, wasUnread }
}

/**
 * What other people's changes did to you (a cancelled booking, a permanent
 * desk given or taken, a deleted office), as a page in the left column: "2
 * new." Opening it marks them read — those stay marked until it closes.
 */
export const NotificationsPage = ({ onClose }: { onClose: () => void }) => {
  const { t, tn } = useI18n()
  const { items, wasUnread } = useOpenedNotifications()

  return (
    <ColumnPage
      label={t("Notifications")}
      title={wasUnread.size ? tn(wasUnread.size, "{n} new.", "{n} new.") : t("Nothing new.")}
      summary={items.length === 0 ? t("Changes to your bookings or desk show up here.") : undefined}
      onClose={onClose}
    >
      {items.length > 0 && (
        <ScrollArea frameClassName="flex-1 -mx-6" className="px-6 pb-6">
          <NotificationList wasUnread={wasUnread} onPick={onClose} />
        </ScrollArea>
      )}
    </ColumnPage>
  )
}

/** The same on a phone: a sheet from the bottom, its headline the news. */
export const NotificationsSheet = ({ onClose }: { onClose: () => void }) => {
  const { t, tn } = useI18n()
  const { items, wasUnread } = useOpenedNotifications()

  return (
    <BottomSheet label={t("Notifications")} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-2">
          <h2 className="text-[32px] leading-none font-black tracking-[-0.03em] text-foreground">
            {wasUnread.size ? tn(wasUnread.size, "{n} new.", "{n} new.") : t("Nothing new.")}
          </h2>
          {items.length === 0 ? (
            <p className="text-lg font-bold text-muted">
              {t("Changes to your bookings or desk show up here.")}
            </p>
          ) : (
            <NotificationList wasUnread={wasUnread} onPick={close} />
          )}
        </div>
      )}
    </BottomSheet>
  )
}

/** The news as ruled lines, newest first; the new ones marked with a dot. */
const NotificationList = ({
  wasUnread,
  onPick,
}: {
  wasUnread: Set<string>
  /** A line that links somewhere was followed. */
  onPick: () => void
}) => {
  const { notifications } = useOrganizationContext()
  const i18n = useI18n()
  const { t, format } = i18n

  return (
    <ul className="divide-y divide-separator border-y border-separator">
      {notifications.items.map((item) => {
        const isNew = wasUnread.has(item.id)
        const body = (
          <>
            {/* New: a dot of the accent beside it, no fill. */}
            <span
              aria-label={isNew ? t("New") : undefined}
              className={clsx("mt-2 size-2.5 shrink-0 rounded-full", isNew && "bg-accent")}
            />
            <span className="min-w-0">
              <span
                className={clsx(
                  "block text-lg leading-snug text-foreground",
                  isNew ? "font-extrabold" : "font-bold"
                )}
              >
                {readNotification(i18n, item.message)}
              </span>
              <span className="mt-0.5 block text-base font-bold text-muted">
                {format.ago(item.createdAt)}
              </span>
            </span>
          </>
        )
        const className = clsx(
          "flex gap-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-focus",
          item.link && "transition-colors hover:bg-foreground/5"
        )

        return (
          <li key={item.id}>
            {item.link ? (
              <Link to={item.link} prefetch="intent" onClick={onPick} className={className}>
                {body}
              </Link>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** The phone's bell: the button, and its sheet while open (no column there). */
export const NotificationsBell = ({ triggerClassName }: { triggerClassName: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <NotificationsButton
        isOpen={isOpen}
        onToggle={() => setIsOpen((wasOpen) => !wasOpen)}
        className={triggerClassName}
      />
      {isOpen && <NotificationsSheet onClose={() => setIsOpen(false)} />}
    </>
  )
}
