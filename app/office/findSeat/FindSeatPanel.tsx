import { CloseButton } from "@heroui/react"
import { useOfficeStore } from "../store"
import { FindSeat } from "./FindSeat"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Shows a desk on the map, on its day. */
export const useShowSeatOnMap = () => {
  const setDay = useOfficeStore((state) => state.setBookingDay)
  const spotlightSeat = useOfficeStore((state) => state.spotlightSeat)

  return (deskId: string, day: Day) => {
    setDay(day)
    spotlightSeat(deskId)
  }
}

/**
 * Finding a seat on a wide screen: a panel docked on the right, the map
 * beside it — a desk shown on the map is seen at once, the panel staying.
 */
export const FindSeatPanel = ({ onClose }: { onClose: () => void }) => {
  const { t } = useI18n()
  const showOnMap = useShowSeatOnMap()

  return (
    <aside
      aria-label={t("Find a seat")}
      className="pointer-events-auto absolute right-5 top-20 bottom-24 z-30 flex w-[400px] max-w-[calc(100vw-7rem)] flex-col rounded-[calc(var(--radius)*3)] border border-border bg-overlay text-foreground shadow-overlay"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-5 pt-4 pb-2">
        <h2 className="text-lg font-black">{t("Find a seat")}</h2>
        <CloseButton aria-label={t("Close")} onPress={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <FindSeat onShowOnMap={showOnMap} />
      </div>
    </aside>
  )
}
