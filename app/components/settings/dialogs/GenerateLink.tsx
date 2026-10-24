import { Modal } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"

export function GenerateLinkDialog() {
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
            <fetcher.Form method="POST" action={`/api/settings/org/${slug}/invitations`}>
              <input type="hidden" name="intent" value="generate" />
              <Modal.Header>
                <p>{t("Are you sure you want to generate a new invite link?")}</p>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/60">
                  {t("The current link will no longer work.")}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" variant="primary" isPending={fetcher.state !== "idle"}>
                  {t("Generate")}
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
