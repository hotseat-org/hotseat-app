import { Spinner } from "@heroui/react"
import { Trash2 } from "lucide-react"
import { useEffect } from "react"
import { Link, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { useOrgSettingsData } from "../data"
import { DeleteOfficeDialog } from "./OfficeDanger"
import { Button } from "~/components/Button"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { useI18n } from "~/i18n/I18nProvider"

/** The organization's offices: open one, or delete it. */
export function OrgOffices() {
  const { slug, officeSlug } = useParams()
  const { dialog, openDialog, closeDialog, close } = useSettings()
  const { t } = useI18n()

  // Loaded on the server with the page; refreshed after a delete.
  const offices = useOrgSettingsData("offices")?.offices
  const deleting = dialog?.startsWith("delete-office:")
    ? offices?.find((o) => o.slug === dialog.slice("delete-office:".length))
    : undefined

  // Deleted (the list refreshed without it): its dialog is done.
  const isStale = !!dialog?.startsWith("delete-office:") && !!offices && !deleting
  useEffect(() => {
    if (isStale) closeDialog()
  }, [isStale, closeDialog])

  if (offices === undefined)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      {offices.length === 0 ? (
        <p className="text-sm text-muted">{t("No offices yet.")}</p>
      ) : (
        <ul
          aria-label={t("Offices")}
          className="flex flex-col divide-y divide-separator border-y border-separator"
        >
          {offices.map((office) => (
            <li key={office.slug} className="flex items-center gap-3 px-4 py-3">
              <ThumbAvatar
                src={office.thumbnail}
                fallback={office.name.slice(0, 1).toUpperCase()}
                className="size-9 rounded-[10px]"
              />
              <Link
                to={`/app/o/${slug}/offices/${office.slug}`}
                prefetch="intent"
                onClick={close}
                className="min-w-0 flex-1 hover:underline"
              >
                <p className="truncate text-sm font-semibold text-foreground">{office.name}</p>
                <p className="truncate text-xs text-muted">
                  /{office.slug}
                  {office.slug === officeSlug && ` · ${t("open now")}`}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={t("Delete {name}", { name: office.name })}
                className="text-danger"
                onPress={() => openDialog(`delete-office:${office.slug}`)}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {deleting && (
        <DeleteOfficeDialog
          name={deleting.name}
          officeSlug={deleting.slug}
          from={deleting.slug === officeSlug ? "org-current" : "org-list"}
        />
      )}
    </div>
  )
}
