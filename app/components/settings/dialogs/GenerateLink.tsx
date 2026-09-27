import { Modal } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"

export function GenerateLinkDialog() {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
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
                <p>Are you sure you want to generate a new invite link?</p>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/60">The current link will no longer work.</p>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isPending={fetcher.state !== "idle"}>
                  Generate
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
