import clsx from "clsx"
import { ArrowLeftRight, Check, Footprints, Link2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { deskName } from "../useBooking"
import { useRoute, walkTime } from "../wayfinding"
import { useEditorStore } from "~/editor/store"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * While a way to a desk is shown: where to, from where (your desk, or the
 * nearest entrance — tap to switch, when you have a desk that day), how far, a
 * link to share it (the page's own URL carries `?to=`; whoever opens it gets
 * the way from their own desk), and a close. Floats at the top, centred.
 */
export const RoutePill = ({ className }: { className?: string }) => {
  const i18n = useI18n()
  const { t } = i18n
  const route = useRoute()
  const clearRoute = useEditorStore((state) => state.clearRoute)
  const setRouteFrom = useEditorStore((state) => state.setRouteFrom)
  const [isCopied, setIsCopied] = useState(false)
  useEffect(() => setIsCopied(false), [route?.deskId])

  useEffect(() => {
    if (!route) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && clearRoute()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [route, clearRoute])

  if (!route) return null
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
    } catch {
      // Clipboard blocked: the address bar has the same link.
    }
  }

  return (
    <div
      role="status"
      className={clsx(
        "pointer-events-auto flex items-center gap-3 rounded-full border border-chrome-border bg-chrome/95 py-1.5 pl-2 pr-1.5 shadow-overlay backdrop-blur-md",
        className
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
        <Footprints className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold text-foreground">
          {t("Way to {desk}", { desk: deskName(i18n, route.desk) })}
        </span>
        <span className="flex items-center gap-1 truncate text-xs text-muted">
          {route.myDesk ? (
            <button
              type="button"
              onClick={() => setRouteFrom(route.fromMyDesk ? "entrance" : "desk")}
              title={
                route.fromMyDesk
                  ? t("Start at the entrance instead")
                  : t("Start at your desk instead")
              }
              className="inline-flex shrink-0 items-center gap-1 rounded-full font-semibold text-accent hover:underline"
            >
              {route.fromMyDesk
                ? route.myDesk.label
                  ? t("From your desk {label}", { label: route.myDesk.label })
                  : t("From your desk")
                : t("From the nearest entrance")}
              <ArrowLeftRight className="size-3" />
            </button>
          ) : (
            route.path && <span className="shrink-0">{t("From the nearest entrance")}</span>
          )}
          {route.path ? (
            <span className="truncate">
              · {Math.round(route.path.length)} m
              <span className="hidden sm:inline"> · {walkTime(i18n, route.path.length)}</span>
            </span>
          ) : (
            !route.myDesk && t("No outside door to start from")
          )}
        </span>
      </span>
      <button
        type="button"
        onClick={copyLink}
        aria-label={isCopied ? t("Link copied") : t("Copy link to this way")}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-accent transition-colors hover:bg-accent/10"
      >
        {isCopied ? <Check className="size-4" /> : <Link2 className="size-4" />}
        <span className="hidden sm:inline">{isCopied ? t("Copied") : t("Copy link")}</span>
      </button>
      <button
        type="button"
        aria-label={t("Close the way")}
        onClick={clearRoute}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
