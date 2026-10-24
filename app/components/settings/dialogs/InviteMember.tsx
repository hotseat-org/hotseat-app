import { Input, Label, Modal, TextField } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"

export function InviteMemberDialog() {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher<{ ok: boolean; error?: string }>()
  const error =
    fetcher.state === "idle" && fetcher.data?.ok === false ? fetcher.data.error : undefined

  // Sent: close. Refused (already a member, not an email): say why, stay open.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) closeDialog()
  }, [fetcher.state, fetcher.data, closeDialog])

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <fetcher.Form method="POST" action={`/api/settings/org/${slug}/invitations`}>
              <input type="hidden" name="intent" value="invite" />
              <Modal.Header>
                <p>{t("Invite a new member")}</p>
              </Modal.Header>
              <Modal.Body>
                <TextField name="email" type="email" isRequired autoFocus isInvalid={!!error}>
                  <Label>{t("Email")}</Label>
                  <Input placeholder={t("name@company.com")} />
                </TextField>
                {/* Reserved, so the dialog doesn't grow when a message appears. */}
                <p role="alert" className="mt-2 min-h-5 text-sm font-bold text-danger">
                  {error}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={closeDialog}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" variant="primary" isPending={fetcher.state !== "idle"}>
                  {t("Invite")}
                </Button>
              </Modal.Footer>
            </fetcher.Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
