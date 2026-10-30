import { PencilRuler } from "lucide-react"
import { EmptyState } from "~/components/ui/EmptyState"
import { useI18n } from "~/i18n/I18nProvider"

/** An empty office, for someone who can't lay it out: why there's nothing here yet. */
export const OfficeNotSetUp = () => {
  const { t } = useI18n()
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-overlay/90 p-6 shadow-overlay backdrop-blur-md">
        <EmptyState
          className="max-w-none"
          icon={PencilRuler}
          title={t("This office isn't set up yet")}
          description={t("An admin needs to lay out the floor before desks can be booked.")}
        />
      </div>
    </div>
  )
}
