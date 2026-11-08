import { FindSeat } from "./FindSeat"
import { useShowSeatOnMap } from "./useFindSeat"
import { ColumnPage } from "~/components/office/ColumnPage"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/**
 * Finding a seat on a wide screen: a page in the office's left column, the
 * office in view beside it. Showing a desk on the map closes it, the map
 * going to that day and floor.
 */
export const FindSeatDialog = ({ onClose }: { onClose: () => void }) => {
  const { t } = useI18n()
  const showSeatOnMap = useShowSeatOnMap()
  const showOnMap = (deskId: string, day: Day) => {
    showSeatOnMap(deskId, day)
    onClose()
  }

  return (
    <ColumnPage title={t("Find a seat")} onClose={onClose}>
      <ScrollArea frameClassName="flex-1 -mx-7" className="px-7">
        <FindSeat onShowOnMap={showOnMap} layout="stacked" />
      </ScrollArea>
    </ColumnPage>
  )
}
