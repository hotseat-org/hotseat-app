import { Modal } from "@heroui/react"
import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { ImageUploadInput } from "~/components/Inputs/ImageUpload"

export function SetAvatarDialog() {
  const { closeDialog } = useSettings()
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
            <fetcher.Form method="POST" action="/api/settings/user/profile">
              <input type="hidden" name="intent" value="set-avatar" />
              <Modal.Header>
                <p>Change avatar</p>
              </Modal.Header>
              <Modal.Body>
                <ImageUploadInput name="thumbnail" onChange={setThumbnail} />
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="tertiary" onPress={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  isDisabled={!thumbnail}
                  isPending={fetcher.state !== "idle"}
                >
                  Save
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
