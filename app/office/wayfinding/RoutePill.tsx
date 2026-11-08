import clsx from "clsx"
import { ArrowLeftRight, ArrowUpDown, Check, Footprints, Link2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { deskName } from "../booking/useBooking"
import { useOfficeStore } from "../store"
import { useRoute, walkTime, type RouteLeg } from "./wayfinding"
import { getFloorId, getFloorNumber, getFloorTitle } from "~/editor/core"
import { useI18n } from "~/i18n/I18nProvider"

/** How long the map stays on each floor of a way through the building (ms). */
const LEG_PAUSE = 2600

/**
 * A way through the building, followed: the map shows the floor it starts on,
 * then each next floor in turn, ending on the desk's — and the floor of a step
 * pressed in the pill. Again whenever the way is asked for.
 */
const useRouteTour = (route: ReturnType<typeof useRoute>) => {
  const showFloor = useOfficeStore((state) => state.showFloor)
  const floors = useOfficeStore((state) => state.floors)

  useEffect(() => {
    if (!route) return

    const floorIds = route.path?.legs.map((leg) => leg.floorId) ?? [getFloorId(route.desk, floors)]
    showFloor(floorIds[0])
    const timers = floorIds
      .slice(1)
      .map((floorId, index) => setTimeout(() => showFloor(floorId), (index + 1) * LEG_PAUSE))

    return () => timers.forEach(clearTimeout)
    // When it's asked for (or its start switched) — not as it's recomputed.
  }, [route?.nonce, route?.deskId])
}

/**
 * While a way to a desk is shown: where to, from where (your desk, or the
 * nearest entrance — tap to switch, when you have a desk that day), how far, a
 * link to share it (the page's own URL carries `?to=`; whoever opens it gets
 * the way from their own desk), and a close. Through the building: its floors
 * in order, how it goes between them (stairs, lift), the shown one marked —
 * each pressed shows its floor. Floats at the top, centred.
 */
export const RoutePill = ({ className }: { className?: string }) => {
  const i18n = useI18n()
  const { t } = i18n
  const route = useRoute()
  const clearRoute = useOfficeStore((state) => state.clearRoute)
  const setRouteFrom = useOfficeStore((state) => state.setRouteFrom)
  const [isCopied, setIsCopied] = useState(false)
  useEffect(() => setIsCopied(false), [route?.deskId])
  useRouteTour(route)

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

  const getStartLabel = () => {
    if (!route.fromMyDesk) return t("From the nearest entrance")
    if (route.myDesk?.label) return t("From your desk {label}", { label: route.myDesk.label })

    return t("From your desk")
  }

  return (
    <div
      role="status"
      className={clsx(
        "pointer-events-auto flex items-center gap-3 rounded-full bg-background py-1.5 pl-2 pr-1.5",
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
              {getStartLabel()}
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
            !route.myDesk && t("No way there: no outside door, or no stairs or lift to its floor")
          )}
        </span>
        {route.path && route.path.legs.length > 1 && <RouteSteps legs={route.path.legs} />}
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

/**
 * A way's floors in order — the shown one marked, each a press away — and how
 * it goes from one to the next: up or down the stairs, or by lift.
 */
const RouteSteps = ({ legs }: { legs: RouteLeg[] }) => {
  const i18n = useI18n()
  const { t } = i18n
  const floors = useOfficeStore((state) => state.floors)
  const currentFloor = useOfficeStore((state) => state.currentFloor)
  const showFloor = useOfficeStore((state) => state.showFloor)
  const getName = (floorId: string) => {
    const floor = floors.find((candidate) => candidate.id === floorId)

    return floor?.name || getFloorTitle(i18n, getFloorNumber(floors, floorId))
  }

  return (
    <span className="mt-1 flex flex-wrap items-center gap-1 text-xs">
      {legs.map((leg) => {
        const isShown = leg.floorId === currentFloor
        const Via = leg.next?.kind === "lift" ? ArrowUpDown : Footprints

        return (
          <span key={leg.floorId} className="flex items-center gap-1">
            <button
              type="button"
              aria-current={isShown || undefined}
              onClick={() => showFloor(leg.floorId)}
              className={clsx(
                "rounded-full px-2 py-0.5 font-bold transition-colors",
                isShown
                  ? "bg-accent text-accent-foreground"
                  : "bg-foreground/5 text-muted hover:text-foreground"
              )}
            >
              {getName(leg.floorId)}
            </button>
            {leg.next && (
              <span
                className="flex items-center gap-0.5 text-muted"
                title={leg.next.kind === "lift" ? t("By lift") : t("By the stairs")}
              >
                <Via className="size-3.5" aria-hidden />
                <span className="sr-only">
                  {leg.next.kind === "lift" ? t("By lift") : t("By the stairs")}
                </span>
                ›
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
