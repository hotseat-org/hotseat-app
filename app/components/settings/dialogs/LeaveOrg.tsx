import { AlertDialog, toast } from "@heroui/react"
import { useEffect } from "react"
import { useFetcher } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { Rich, useI18n } from "~/i18n/I18nProvider"

export function LeaveOrgDialog({ slug }: { slug: string }) {
  const { closeDialog } = useSettings()
  const { t } = useI18n()
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
                {t("Are you sure you want to leave this organization?")}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                <Rich
                  text={t("This will permanently {delete} your data in the organization.")}
                  values={{ delete: <strong>{t("delete")}</strong> }}
                />
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={closeDialog}>
                {t("Close")}
              </Button>
              <fetcher.Form method="POST" action="/api/settings/user/organizations">
                <input type="hidden" name="intent" value="leave" />
                <input type="hidden" name="slug" value={slug} />
                <Button isPending={fetcher.state === "submitting"} type="submit" variant="danger">
                  {t("Leave")}
                </Button>
              </fetcher.Form>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
