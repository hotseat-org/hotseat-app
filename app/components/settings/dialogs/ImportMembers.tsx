import { Chip, Modal } from "@heroui/react"
import clsx from "clsx"
import { FileUp } from "lucide-react"
import { useMemo, useState, type ChangeEvent } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { useI18n } from "~/i18n/I18nProvider"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { readImportList, type ImportPerson } from "~/utils/memberImport"

/** The most people one import takes (as the server checks). */
const MAX_IMPORT = 5000
/** People listed in the preview (the rest are counted). */
const MAX_SHOWN = 200

interface ImportResult {
  ok: boolean
  intent?: "import"
  added?: number
  alreadyMembers?: number
}

/**
 * Members → Import: people from a list, members straight away. A CSV exported
 * from Google Workspace, Microsoft 365 or a spreadsheet (its columns
 * recognised by name), or pasted addresses; previewed — who's new, who's in
 * already, which rows have no email — and, if the list has org units or
 * departments, only some of them.
 */
export function ImportMembersDialog({ memberEmails }: { memberEmails: Set<string> }) {
  const { slug } = useParams()
  const { closeDialog } = useSettings()
  const { t, tn } = useI18n()
  const fetcher = useFetcher<ImportResult>()
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  // The groups chosen (none: all of them).
  const [chosenGroups, setChosenGroups] = useState<Set<string>>(new Set())

  const list = useMemo(() => readImportList(text), [text])
  const inChosenGroups = (person: ImportPerson) =>
    chosenGroups.size === 0 || chosenGroups.has(person.group)
  const chosen = list.people.filter(inChosenGroups)
  const newPeople = chosen.filter((person) => !memberEmails.has(person.email))
  const memberCount = chosen.length - newPeople.length
  const result = fetcher.state === "idle" && fetcher.data?.intent === "import" ? fetcher.data : null

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setChosenGroups(new Set())
    setText(await file.text())
  }

  const toggleGroup = (group: string) =>
    setChosenGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) next.delete(group)
      else next.add(group)

      return next
    })

  const importPeople = () =>
    fetcher.submit(
      {
        intent: "import",
        people: JSON.stringify(
          newPeople.slice(0, MAX_IMPORT).map((person) => ({
            email: person.email,
            displayName: person.displayName || undefined,
            role: person.isAdmin ? Role.ADMIN : Role.USER,
          }))
        ),
      },
      { method: "POST", action: `/api/settings/org/${slug}/members` }
    )

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="w-[640px] max-w-[calc(100vw-2rem)]">
            {/* A plain row, not Modal.Header (a column): the close button sits beside the title. */}
            <div className="flex items-start justify-between gap-4 pb-2">
              <div>
                <Modal.Heading className="text-lg font-black text-foreground">
                  {t("Import people")}
                </Modal.Heading>
                <p className="mt-1 text-sm text-muted">
                  {t(
                    "They're members straight away: in Who's in, ready for a desk. Their first sign-in takes over the account."
                  )}
                </p>
              </div>
              <DialogCloseButton onClose={closeDialog} />
            </div>

            <Modal.Body>
              {result?.ok ? (
                <ImportDone added={result.added ?? 0} alreadyMembers={result.alreadyMembers ?? 0} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-accent/50">
                      <FileUp className="size-5 shrink-0 text-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">
                          {fileName ?? t("Choose a CSV file")}
                        </span>
                        <span className="block text-xs text-muted">
                          {t(
                            "From Google Workspace (Users → Download users), Microsoft 365, or a spreadsheet with an email column."
                          )}
                        </span>
                      </span>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt,text/csv,text/plain"
                        onChange={readFile}
                        className="sr-only"
                      />
                    </label>
                    <textarea
                      value={fileName ? "" : text}
                      onChange={(event) => {
                        setFileName(null)
                        setText(event.target.value)
                      }}
                      placeholder={t("…or paste email addresses, one per line")}
                      aria-label={t("Email addresses")}
                      className="h-20 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus-visible:border-accent"
                    />
                  </div>

                  {list.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" aria-label={t("Groups")}>
                      {list.groups.map((group) => (
                        <button
                          key={group}
                          type="button"
                          aria-pressed={chosenGroups.has(group)}
                          onClick={() => toggleGroup(group)}
                          className={clsx(
                            "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                            chosenGroups.has(group)
                              ? "border-accent bg-accent/12 text-accent"
                              : "border-border text-muted hover:text-foreground"
                          )}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fixed height: the dialog doesn't grow as a list arrives. */}
                  <div className="flex h-64 flex-col overflow-hidden rounded-xl border border-border">
                    <p className="border-b border-border bg-surface-secondary px-3 py-2 text-xs font-bold text-muted">
                      {text.trim()
                        ? [
                            tn(newPeople.length, "{n} new", "{n} new"),
                            memberCount > 0 &&
                              tn(memberCount, "{n} already a member", "{n} already members"),
                            list.invalid.length > 0 &&
                              tn(
                                list.invalid.length,
                                "{n} row without an email",
                                "{n} rows without an email"
                              ),
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : t("Who'd be added shows here.")}
                    </p>
                    <ul className="flex-1 divide-y divide-separator overflow-y-auto">
                      {chosen.slice(0, MAX_SHOWN).map((person) => (
                        <PersonRow
                          key={person.email}
                          person={person}
                          isMember={memberEmails.has(person.email)}
                        />
                      ))}
                      {chosen.length > MAX_SHOWN && (
                        <li className="px-3 py-2 text-xs text-muted">
                          {tn(chosen.length - MAX_SHOWN, "…and {n} more", "…and {n} more")}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              {result?.ok ? (
                <Button variant="primary" onPress={closeDialog}>
                  {t("Done")}
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onPress={closeDialog}>
                    {t("Cancel")}
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={newPeople.length === 0}
                    isPending={fetcher.state !== "idle"}
                    onPress={importPeople}
                  >
                    {newPeople.length > 0
                      ? tn(newPeople.length, "Add {n} person", "Add {n} people")
                      : t("Add people")}
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

/** One person in the preview: name and email, group, admin or already in. */
const PersonRow = ({ person, isMember }: { person: ImportPerson; isMember: boolean }) => {
  const { t } = useI18n()

  return (
    <li className={clsx("flex items-center gap-3 px-3 py-2", isMember && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{person.displayName || person.email}</p>
        <p className="truncate text-xs text-muted">
          {[person.displayName && person.email, person.group].filter(Boolean).join(" · ")}
        </p>
      </div>
      {isMember ? (
        <span className="shrink-0 text-xs text-muted">{t("Already a member")}</span>
      ) : (
        person.isAdmin && <Chip color="warning">{t("Admin")}</Chip>
      )}
    </li>
  )
}

/** After the import: how many were added. */
const ImportDone = ({ added, alreadyMembers }: { added: number; alreadyMembers: number }) => {
  const { tn } = useI18n()

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
      <p className="text-2xl font-black">{tn(added, "{n} person added", "{n} people added")}</p>
      {alreadyMembers > 0 && (
        <p className="text-sm text-muted">
          {tn(alreadyMembers, "{n} was a member already.", "{n} were members already.")}
        </p>
      )}
    </div>
  )
}
