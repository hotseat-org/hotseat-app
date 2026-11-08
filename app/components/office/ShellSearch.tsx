import { Armchair, Search } from "lucide-react"
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { MemberAvatar, PANEL, PANEL_HOVER, nameOf, type ShellMember } from "./shell-ui"
import { ColumnPage } from "./ColumnPage"
import { useOfficeStore } from "~/office/store"
import { isSeatable } from "~/office/catalog"
import { useI18n } from "~/i18n/I18nProvider"
import { useAllPieces } from "~/editor"
import type { SceneObject } from "~/editor/core"
import { dayPhrase, useDesksOnDay, useDeskFloor } from "~/office/booking/useBooking"
import { useTeams } from "~/office/teams"
import { useOfficePanel } from "~/office/useOfficePanel"
import { usePersonProfile } from "~/office/usePersonProfile"
import { TeamTile } from "~/components/teams/teamLook"
import { ScrollArea } from "~/components/ui/ScrollArea"
import type { OfficeTeam } from "~/utils/teams"

interface Result {
  key: string
  title: string
  subtitle: string
  /** A desk: its card opens. */
  deskId?: string
  /** A person: their profile opens. */
  member?: ShellMember
  /** A team: Who's in opens at it. */
  team?: OfficeTeam
}

/**
 * The search button in the top bar (⌘K or Ctrl+K toggles it too): it opens
 * search in the office's left column, where every page's words are.
 */
export const SearchButton = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => {
  const { t } = useI18n()

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onToggle()
      }
    }
    window.addEventListener("keydown", handleKey)

    return () => window.removeEventListener("keydown", handleKey)
  }, [onToggle])

  return (
    <button
      type="button"
      aria-label={t("Find a person or seat (⌘K)")}
      aria-expanded={isOpen}
      onClick={onToggle}
      className={`${PANEL} ${PANEL_HOVER} grid size-11 cursor-pointer place-items-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus`}
    >
      {/* An icon, as the mockups' (its name, with ⌘K, is its label). */}
      <Search className="size-5" strokeWidth={2.2} />
    </button>
  )
}

/**
 * "Find a person or seat": members, teams and desk labels in this office, as
 * a page in the left column — what you type is its headline. Picking a person
 * opens their profile (where they sit, and when); a team, Who's in at that
 * team; a desk, its card in the column (as clicking it).
 */
export const SearchPage = ({
  members,
  onClose,
}: {
  members: ShellMember[]
  onClose: () => void
}) => {
  const i18n = useI18n()
  const { t } = i18n
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const [query, setQuery] = useState("")
  const objects = useAllPieces()
  const getDeskFloor = useDeskFloor()
  const openSeatCard = useOfficeStore((s) => s.openSeatCard)
  const { open: openProfile } = usePersonProfile()
  const officePanel = useOfficePanel()
  const teams = useTeams()
  const { byPerson } = useDesksOnDay()

  // "today", or "on Wed 23 Sep": the day the results are about.
  const when = dayPhrase(i18n, day, today)
  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase()
    const desks = objects.filter((object) => isSeatable(object.type))
    // "Desk B2", with its floor in an office with floors: "Desk B2 · Attic".
    const withFloor = (text: string, desk: SceneObject) => {
      const floor = getDeskFloor(desk)

      return floor ? `${text} · ${floor}` : text
    }
    // Where each sits on the shown day (a booking, or their permanent desk).
    const people: Result[] = members.map((member) => {
      const desk = byPerson.get(member.userEmail)?.desk

      return {
        key: `p:${member.userEmail}`,
        title: nameOf(member),
        // Where they are, as a sentence: "At Desk D7 today."
        subtitle: desk
          ? t("At {desk} {when}.", {
              desk: withFloor(
                desk.label ? t("Desk {label}", { label: desk.label }) : t("a desk"),
                desk
              ),
              when,
            })
          : t("Not in {when}.", { when }),
        member,
      }
    })
    const seats: Result[] = desks
      .filter((desk) => desk.label)
      .map((desk) => {
        const who = members.find((member) => member.userEmail === desk.assignee)
        return {
          key: `d:${desk.id}`,
          title: withFloor(t("Desk {label}", { label: desk.label ?? "" }), desk),
          subtitle: who ? t("{name}'s permanent desk.", { name: nameOf(who) }) : t("Free to book."),
          deskId: desk.id,
        }
      })
    const teamResults: Result[] = teams
      .filter((team) => team.members.length > 0)
      .map((team) => ({
        key: `t:${team.id}`,
        title: team.name,
        subtitle: t("{in} of {total} in {when}.", {
          in: team.members.filter((email) => byPerson.has(email)).length,
          total: team.members.length,
          when,
        }),
        team,
      }))
    const all = [...people, ...teamResults, ...seats]
    if (!needle) return all.slice(0, 8)
    return all
      .filter((result) =>
        `${result.title} ${result.subtitle} ${result.member?.userEmail ?? ""}`
          .toLowerCase()
          .includes(needle)
      )
      .slice(0, 8)
  }, [query, objects, members, t, getDeskFloor, teams, byPerson, when])

  const pick = (result: Result) => {
    onClose()
    if (result.member) openProfile(result.member.userEmail)
    else if (result.team) officePanel.open("people", { team: result.team.id })
    else if (result.deskId) openSeatCard(result.deskId)
  }

  return (
    <ColumnPage
      label={t("Find a person or seat")}
      title={
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) pick(results[0])
          }}
          placeholder={t("Who or where?")}
          aria-label={t("Search people, teams and desks")}
          // What you type is the headline: the page's title, on a line of its own.
          className="w-full border-0 border-b-[3px] border-foreground bg-transparent pb-2 text-[clamp(40px,4vw,56px)] leading-none font-black tracking-[-0.035em] text-foreground outline-none placeholder:text-muted/70 focus-visible:border-accent"
        />
      }
      onClose={onClose}
    >
      {results.length === 0 ? (
        <p className="pt-4 text-xl font-extrabold text-muted">
          {t("No people, teams or desks match.")}
        </p>
      ) : (
        <ScrollArea frameClassName="flex-1 -mx-6" className="px-6 pb-6">
          <ul className="divide-y divide-separator border-y border-separator">
            {results.map((result, index) => (
              <li key={result.key}>
                <button
                  type="button"
                  onClick={() => pick(result)}
                  style={{ "--index": index } as CSSProperties}
                  className="motion-stagger flex h-[68px] w-full items-center gap-4 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {result.member ? (
                    <MemberAvatar m={result.member} className="size-10 rounded-full" />
                  ) : result.team ? (
                    <TeamTile
                      name={result.team.name}
                      color={result.team.color}
                      className="size-10 rounded-full text-xs"
                    />
                  ) : (
                    <span className="grid size-10 place-items-center rounded-full border-2 border-foreground text-foreground">
                      <Armchair className="size-5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xl leading-tight font-black tracking-[-0.01em] text-foreground">
                      {result.title}
                    </span>
                    <span className="block truncate text-base font-bold text-muted">
                      {result.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </ColumnPage>
  )
}
