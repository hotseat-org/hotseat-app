import { AlertDialog, toast } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"

/** An admin removing someone from the organization (opened from Members). */
export function RemoveMemberDialog({ email, name }: { email: string; name: string }) {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const error = fetcher.data?.ok === false ? fetcher.data.error : undefined

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
              <AlertDialog.Heading>Remove {name}?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {name} loses access to the organization. Their bookings are cancelled and their
                permanent desk becomes bookable. You can invite them again later.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={closeDialog}>
                Keep
              </Button>
              <fetcher.Form method="POST" action={`/api/settings/org/${slug}/members`}>
                <input type="hidden" name="intent" value="remove" />
                <input type="hidden" name="userEmail" value={email} />
                <Button isPending={fetcher.state !== "idle"} type="submit" variant="danger">
                  Remove
                </Button>
              </fetcher.Form>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
