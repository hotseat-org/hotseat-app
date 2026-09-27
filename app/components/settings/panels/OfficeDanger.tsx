import { Modal } from "@heroui/react"
import { useFetcher, useParams } from "react-router"
import { SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { useOfficeData } from "./OfficeGeneral"
import { Button } from "~/components/Button"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useProfile } from "~/utils/remix"

export function OfficeDanger() {
  const { dialog, openDialog } = useSettings()
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
      {dialog === "delete-office" && <DeleteOfficeDialog name={name} />}
    </>
  )
}

function DeleteOfficeDialog({ name }: { name: string }) {
  const { slug, officeSlug } = useParams()
  const { closeDialog } = useSettings()
  const fetcher = useFetcher()
  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            {/* The action redirects to the offices list on success. */}
            <fetcher.Form
              method="POST"
              action={`/api/settings/office/${slug}/${officeSlug}/general`}
            >
              <input type="hidden" name="intent" value="delete-office" />
              <Modal.Header>
                <p>Delete {name}?</p>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Its layout and every desk assignment are deleted for everyone.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" isPending={fetcher.state !== "idle"}>
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
