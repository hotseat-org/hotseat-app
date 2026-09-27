import { Input, Label, Modal, TextField } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"

export function InviteMemberDialog() {
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
              <input type="hidden" name="intent" value="invite" />
              <Modal.Header>
                <p>Invite a new member</p>
              </Modal.Header>
              <Modal.Body>
                <TextField name="email" isRequired autoFocus>
                  <Label>Email</Label>
                  <Input />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isPending={fetcher.state !== "idle"}>
                  Invite
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
