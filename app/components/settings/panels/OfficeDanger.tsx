import { Input, Label, Modal, TextField } from "@heroui/react"
import { useEffect, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { useOfficeData } from "./OfficeGeneral"
import { Button } from "~/components/Button"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useProfile } from "~/utils/remix"

export function OfficeDanger() {
  const { dialog, openDialog } = useSettings()
  const { officeSlug } = useParams()
  const isAdmin = useProfile().role === Role.ADMIN
  const name = useOfficeData()?.office.name ?? "this office"

  return (
    <>
      <SettingsCard className="flex flex-col gap-4 border-danger/40 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-black text-foreground">Delete this office</p>
          <p className="mt-1 text-sm text-muted">
            Removes {name}, its layout and all desk assignments. There is no going back.
          </p>
        </div>
        {isAdmin ? (
          <Button variant="danger" onPress={() => openDialog("delete-office")}>
            Delete office
          </Button>
        ) : (
          <p className="text-xs text-muted">Only admins can delete offices.</p>
        )}
      </SettingsCard>
      {dialog === "delete-office" && (
        <DeleteOfficeDialog name={name} officeSlug={officeSlug ?? ""} />
      )}
    </>
  )
}

/**
 * "Type the name to confirm" — from the office's own settings, or (`from`) the
 * organization's office list, which may stay open after (see the action).
 */
export function DeleteOfficeDialog({
  name,
  officeSlug,
  from,
}: {
  name: string
  officeSlug: string
  from?: "org-list" | "org-current"
}) {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const fetcher = useFetcher<{ ok?: boolean }>()
  const [typed, setTyped] = useState("")
  // Deleted without leaving the page: close (the list has already refreshed).
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) closeDialog()
  }, [fetcher.state, fetcher.data, closeDialog])
  const isConfirmed = typed.trim().toLowerCase() === name.trim().toLowerCase()
  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            {/* On success the action redirects to the offices list (or, from
                another office's row in the org list, returns ok). */}
            <fetcher.Form
              method="POST"
              action={`/api/settings/office/${slug}/${officeSlug}/general`}
            >
              <input type="hidden" name="intent" value="delete-office" />
              {from && <input type="hidden" name="from" value={from} />}
              <Modal.Header>
                <p>Delete {name}?</p>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Its layout, every permanent desk and everyone&apos;s upcoming bookings in it are
                  deleted. There is no going back.
                </p>
                <TextField value={typed} onChange={setTyped} autoFocus>
                  <Label>Type {name} to confirm</Label>
                  <Input autoComplete="off" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  isDisabled={!isConfirmed}
                  isPending={fetcher.state !== "idle"}
                >
                  Delete office
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
