import { Modal } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"

interface Props {
  /** Defaults: the org logo. The office cover passes its own. */
  action?: string
  intent?: string
  title?: string
}

export function DeleteLogoDialog({ action, intent = "delete-logo", title }: Props) {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher()

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) closeDialog()
  }, [fetcher.state, fetcher.data, closeDialog])

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <fetcher.Form method="POST" action={action ?? `/api/settings/org/${slug}/general`}>
              <input type="hidden" name="intent" value={intent} />
              <Modal.Header>
                <p>{title ?? t("Are you sure you want to delete this logo?")}</p>
              </Modal.Header>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  {t("Close")}
                </Button>
                <Button type="submit" variant="danger" isPending={fetcher.state !== "idle"}>
                  {t("Delete")}
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
