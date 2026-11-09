import { AlertDialog } from "@heroui/react"
import { useEffect, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { useSettings } from "../useSettings"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { Button } from "~/components/Button"
import { TeamDot } from "~/components/teams/teamLook"
import { useI18n } from "~/i18n/I18nProvider"
import type { TeamActionData } from "~/routes/api.settings.org.$slug.teams"
import { LINK_CLASS } from "~/components/ui/link"

export interface MemberTeam {
  id: string
  name: string
  color: string
  members: string[]
}

/** An admin choosing which teams someone is in (opened from Members). */
export function MemberTeamsDialog({
  email,
  name,
  teams,
}: {
  email: string
  name: string
  teams: MemberTeam[]
}) {
  const { slug } = useParams()
  const { closeDialog, selectSection } = useSettings()
  const { t } = useI18n()
  const fetcher = useFetcher<TeamActionData>()
  const [chosen, setChosen] = useState(
    () => new Set(teams.filter((team) => team.members.includes(email)).map((team) => team.id))
  )

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) closeDialog()
  }, [fetcher.state, fetcher.data, closeDialog])

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)

      return next
    })
  const save = () =>
    fetcher.submit(
      { intent: "member-teams", email, teamIds: JSON.stringify([...chosen]) },
      { method: "POST", action: `/api/settings/org/${slug}/teams` }
    )

  return (
    <AlertDialog isOpen onOpenChange={(isOpen) => !isOpen && closeDialog()}>
      <AlertDialog.Backdrop isDismissable>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Heading>{t("{name}'s teams", { name })}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {teams.length === 0 ? (
                <p className="text-sm text-muted">
                  {t("No teams yet.")}{" "}
                  <button
                    type="button"
                    onClick={() => selectSection("teams")}
                    className={LINK_CLASS}
                  >
                    {t("Make one")}
                  </button>
                </p>
              ) : (
                <ScrollArea className="max-h-80">
                  <ul className="flex flex-col">
                    {teams.map((team) => (
                      <li key={team.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-surface-secondary">
                          <input
                            type="checkbox"
                            checked={chosen.has(team.id)}
                            onChange={() => toggle(team.id)}
                            className="size-5 shrink-0 accent-[var(--accent)]"
                          />
                          <TeamDot color={team.color} />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold">
                            {team.name}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={closeDialog}>
                {t("Cancel")}
              </Button>
              {teams.length > 0 && (
                <Button variant="primary" onPress={save} isPending={fetcher.state !== "idle"}>
                  {t("Save")}
                </Button>
              )}
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
