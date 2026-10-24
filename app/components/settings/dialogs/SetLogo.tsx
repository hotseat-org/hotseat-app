import { Modal } from "@heroui/react"
import { useEffect, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"
import { ImageUploadInput } from "~/components/Inputs/ImageUpload"

interface Props {
  /** Defaults: the org logo. The office cover passes its own. */
  action?: string
  intent?: string
  title?: string
}

export function SetLogoDialog({ action, intent = "set-logo", title }: Props) {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher()
  const [thumbnail, setThumbnail] = useState<string>()

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
                <p>{title ?? t("Change logo")}</p>
              </Modal.Header>
              <Modal.Body>
                <ImageUploadInput name="thumbnail" onChange={setThumbnail} />
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="tertiary" onPress={closeDialog}>
                  {t("Cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  isDisabled={!thumbnail}
                  isPending={fetcher.state !== "idle"}
                >
                  {t("Save")}
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
