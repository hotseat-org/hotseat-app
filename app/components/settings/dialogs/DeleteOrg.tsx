import { Modal } from "@heroui/react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"

export function DeleteOrgDialog() {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher()

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <fetcher.Form method="POST" action={`/api/settings/org/${slug}/danger`}>
              <Modal.Header>
                <p>{t("Are you sure you want to delete this organization?")}</p>
              </Modal.Header>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  {t("Cancel")}
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
