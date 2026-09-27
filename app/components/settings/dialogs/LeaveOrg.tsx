import { AlertDialog, toast } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"

export function LeaveOrgDialog({ slug }: { slug: string }) {
  const { closeDialog } = useSettings()
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>()
  const error = fetcher.data?.error

  useEffect(() => {
    if (error) toast.danger(error, { onClose: () => fetcher.reset() })
  }, [error, fetcher])

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) closeDialog()
  }, [fetcher.state, fetcher.data, closeDialog])

  return (
    <AlertDialog isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <AlertDialog.Backdrop isDismissable>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>
                Are you sure you want to leave this organization?
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                This will permanently <strong>delete</strong> your data in the organization.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={closeDialog}>
                Close
              </Button>
              <fetcher.Form method="POST" action="/api/settings/user/organizations">
                <input type="hidden" name="intent" value="leave" />
                <input type="hidden" name="slug" value={slug} />
                <Button isPending={fetcher.state === "submitting"} type="submit" variant="danger">
                  Leave
                </Button>
              </fetcher.Form>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
