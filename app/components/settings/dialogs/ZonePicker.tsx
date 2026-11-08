import { Modal } from "@heroui/react"
import clsx from "clsx"
import { Check, Search } from "lucide-react"
import { useState } from "react"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { toSearchable } from "~/components/people/PeopleSearch"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { useI18n } from "~/i18n/I18nProvider"

/** An office as the picker shows it: its zones, each with its colour and desks. */
export interface PickerOffice {
  slug: string
  name: string
  zones: { name: string; color: string; deskCount: number }[]
}

/** Offices shown before a search is worth having. */
const SEARCH_FROM = 4

/**
 * Where a team sits: the offices, each with its zones to pick from (in their
 * colours, with how many desks). Changing an office's zone, just that office.
 */
export const ZonePickerDialog = ({
  offices,
  chosen,
  onPick,
  onClose,
}: {
  /** Those to pick from (offices without zones left out). */
  offices: PickerOffice[]
  /** The zone it has now (changing one), marked. */
  chosen?: { officeSlug: string; zone: string }
  onPick: (officeSlug: string, zone: string) => void
  onClose: () => void
}) => {
  const { t, tn } = useI18n()
  const [query, setQuery] = useState("")
  const searchable = toSearchable(query.trim())
  const listed = offices
    .map((office) =>
      // An office found by its name keeps every zone; else, the zones found.
      toSearchable(office.name).includes(searchable)
        ? office
        : {
            ...office,
            zones: office.zones.filter((zone) => toSearchable(zone.name).includes(searchable)),
          }
    )
    .filter((office) => office.zones.length > 0)

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="w-[560px] max-w-[calc(100vw-2rem)]">
            <div className="flex items-start justify-between gap-4 pb-2">
              <div>
                <Modal.Heading className="text-3xl leading-tight font-black tracking-[-0.02em] text-foreground">
                  {chosen ? t("Change the zone") : t("Add a zone")}
                </Modal.Heading>
                <p className="mt-1 text-sm text-muted">
                  {t("Where the team sits. Find a seat puts its people there first.")}
                </p>
              </div>
              <DialogCloseButton onClose={onClose} />
            </div>

            <Modal.Body className="flex flex-col gap-4">
              {offices.length >= SEARCH_FROM && (
                <label className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-focus">
                  <Search className="size-4 shrink-0 text-muted" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder={t("Search offices and zones")}
                    aria-label={t("Search offices and zones")}
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                  />
                </label>
              )}

              {/* With a search, a fixed height: searching doesn't make the dialog jump. */}
              <ScrollArea
                className={clsx(
                  "flex flex-col gap-5 pr-1",
                  offices.length >= SEARCH_FROM ? "h-[min(420px,60vh)]" : "max-h-[60vh]"
                )}
              >
                {listed.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted">
                    {offices.length === 0
                      ? t("No other office has zones yet.")
                      : t("Nothing matches “{query}”", { query: query.trim() })}
                  </p>
                )}
                {listed.map((office) => (
                  <section key={office.slug} aria-label={office.name}>
                    <h3 className="mb-2 flex items-baseline gap-2">
                      <span className="text-sm font-black">{office.name}</span>
                      <span className="text-xs text-muted">
                        {tn(office.zones.length, "{n} zone", "{n} zones")}
                      </span>
                    </h3>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {office.zones.map((zone) => {
                        const isChosen =
                          chosen?.officeSlug === office.slug && chosen.zone === zone.name

                        return (
                          <li key={zone.name}>
                            <button
                              type="button"
                              aria-pressed={isChosen}
                              onClick={() => onPick(office.slug, zone.name)}
                              className={clsx(
                                "flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                                isChosen
                                  ? "border-accent bg-accent/10"
                                  : "border-border bg-surface hover:border-muted"
                              )}
                            >
                              <span
                                aria-hidden
                                className="grid size-8 shrink-0 place-items-center rounded-lg"
                                style={{
                                  background: `color-mix(in srgb, ${zone.color} 22%, transparent)`,
                                }}
                              >
                                <span
                                  className="size-3 rounded-full"
                                  style={{ background: zone.color }}
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-extrabold">
                                  {zone.name}
                                </span>
                                <span className="block text-xs text-muted">
                                  {tn(zone.deskCount, "{n} desk", "{n} desks")}
                                </span>
                              </span>
                              {isChosen && <Check className="size-4 shrink-0 text-accent" />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </ScrollArea>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
