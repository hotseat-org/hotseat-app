import { Modal } from "@heroui/react"
import { FindSeat } from "./FindSeat"
import { useShowSeatOnMap } from "./useFindSeat"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/**
 * Finding a seat on a wide screen: a dialog over the office. Showing a desk
 * on the map closes it, the map going to that day and floor.
 */
export const FindSeatDialog = ({ onClose }: { onClose: () => void }) => {
  const { t } = useI18n()
  const showSeatOnMap = useShowSeatOnMap()
  const showOnMap = (deskId: string, day: Day) => {
    showSeatOnMap(deskId, day)
    onClose()
  }

  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && onClose()} isDismissable>
      <Modal.Container scroll="inside">
        <Modal.Dialog className="flex h-[min(680px,86vh)] w-[880px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[calc(var(--radius)*3)] p-0">
          <div className="flex shrink-0 items-center justify-between gap-2 px-6 pt-5 pb-3">
            <Modal.Heading className="text-lg font-black text-foreground">
              {t("Find a seat")}
            </Modal.Heading>
            <DialogCloseButton onClose={onClose} />
          </div>
          <ScrollArea frameClassName="flex-1" className="px-6 pb-6">
            <FindSeat onShowOnMap={showOnMap} layout="columns" />
          </ScrollArea>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
