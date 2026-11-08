import { MapPin, Settings2 } from "lucide-react"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { ColumnPage } from "./ColumnPage"
import { MemberAvatar, nameOf, type ShellMember } from "./shell-ui"
import { WeekDots } from "./WeekDots"
import { PeopleSearch, type PeopleGroup } from "~/components/people/PeopleSearch"
import { TeamDot } from "~/components/teams/teamLook"
import { useOfficeStore } from "~/office/store"
import { dayPhrase, deskName, useDesksOnDay, useWeekPresence } from "~/office/booking/useBooking"
import { usePersonProfile } from "~/office/usePersonProfile"
import { useTeams } from "~/office/teams"
import { getTeamHex, type OfficeTeam } from "~/utils/teams"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useI18n } from "~/i18n/I18nProvider"

/** Who's in on the shown day (people with a desk first); Find opens their desk. */
export const WhosInList = ({
  me,
  members,
  onFind,
  hasSummary = true,
}: {
  me: ShellMember
  members: ShellMember[]
  onFind: () => void
  /** Its own sentence on top (the phone's sheet); a page's headline says it instead. */
  hasSummary?: boolean
}) => {
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const spotlightSeat = useOfficeStore((s) => s.spotlightSeat)
  const i18n = useI18n()
  const { t } = i18n
  const { open: openSettings } = useSettings()
  const { open: openProfile } = usePersonProfile()
  const { byPerson } = useDesksOnDay()
  const week = useWeekPresence()
  const roster = useMemo(
    () =>
      members
        .map((m, i) => ({ m, i, at: byPerson.get(m.userEmail) }))
        .sort((a, b) => Number(!a.at) - Number(!b.at) || a.i - b.i),
    [members, byPerson]
  )
  const inCount = roster.filter((r) => r.at).length
  const teams = useTeams()
  // Opened at a team (from the search): by team, just that one open.
  const [searchParams] = useSearchParams()
  const focusedTeam = searchParams.get("team")
  const [view, setView] = useState<WhosInView>(focusedTeam ? "teams" : "everyone")
  useEffect(() => {
    if (focusedTeam) setView("teams")
  }, [focusedTeam])
  // By team: yours first (open), then the others and those in none (folded).
  const groups = useMemo(() => {
    type Row = (typeof roster)[number]
    const isMine = (team: OfficeTeam) => team.members.includes(me.userEmail)
    const withPeople = teams
      .filter((team) => team.members.length > 0 && (view !== "mine" || isMine(team)))
      .sort(
        (first, second) =>
          Number(isMine(second)) - Number(isMine(first)) || first.name.localeCompare(second.name)
      )
    const teamGroups: PeopleGroup<Row>[] = withPeople.map((team) => ({
      id: team.id,
      isIn: ({ m }) => team.members.includes(m.userEmail),
      isOpenAtFirst: focusedTeam ? team.id === focusedTeam : isMine(team),
      renderHeading: () => (
        <TeamHeading
          name={team.name}
          color={team.color}
          isMine={isMine(team)}
          inCount={team.members.filter((email) => byPerson.has(email)).length}
          total={team.members.length}
        />
      ),
    }))
    if (view === "mine") return teamGroups

    const inTeam = new Set(teams.flatMap((team) => team.members))
    const withoutTeam: PeopleGroup<Row> = {
      id: "no-team",
      isIn: ({ m }) => !inTeam.has(m.userEmail),
      renderHeading: (found) => <TeamHeading name={t("No team")} total={found.length} />,
    }

    return [...teamGroups, withoutTeam]
  }, [teams, me.userEmail, byPerson, view, t, focusedTeam])
  const isInTeam = teams.some((team) => team.members.includes(me.userEmail))
  const views: [WhosInView, string][] = [
    ["everyone", t("Everyone")],
    ["teams", t("By team")],
    ...(isInTeam ? [["mine", t("My teams")] as [WhosInView, string]] : []),
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className={hasSummary ? "mb-3" : "sr-only"}>
        {/* The page in a sentence (the headline's way), not "Today · 2 of 20". */}
        <p className="text-lg leading-snug font-bold text-muted">
          {t("{in} of {total} in the office {when}.", {
            in: inCount,
            total: members.length,
            when: dayPhrase(i18n, day, today),
          })}
        </p>
      </header>
      {members.length <= 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-bold text-foreground">{t("It's just you so far")}</p>
          {/* Inviting is an admin's. */}
          {me.role === Role.ADMIN && (
            <button
              type="button"
              onClick={() => openSettings("org", "invitations")}
              className="min-h-11 rounded-xl bg-accent/15 px-4 text-sm font-bold text-accent"
            >
              {t("Invite teammates")}
            </button>
          )}
        </div>
      ) : (
        <PeopleSearch
          className="min-h-0 flex-1"
          // Another team picked: its groups start over, that one open.
          key={focusedTeam ?? "everyone"}
          items={roster}
          groups={view === "everyone" ? undefined : groups}
          toolbar={
            teams.length > 0 && (
              <div role="group" aria-label={t("Show")} className="flex gap-1.5">
                {views.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={clsx(
                      "min-h-9 rounded-full border px-3 text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                      view === id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted hover:border-muted hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          }
          getPerson={({ m }) => ({
            email: m.userEmail,
            name: m.userEmail === me.userEmail ? t("You") : nameOf(m),
            avatarUrl: m.avatarUrl,
          })}
          renderFace={({ m }) => <MemberAvatar m={m} className="size-10 shrink-0 rounded-xl" />}
          // A row opens their profile (Find, beside it, their desk).
          onPick={({ m }) => openProfile(m.userEmail)}
          renderDetail={({ m, at }) => (
            <span className="flex items-center gap-2">
              {/* Fixed width: every row's dots start at the same spot. */}
              <span className="w-16 shrink-0 truncate">
                {at ? deskName(i18n, at.desk) : t("Not in")}
              </span>
              <WeekDots email={m.userEmail} presence={week} />
            </span>
          )}
          renderAside={({ m, at }) =>
            at && (
              <button
                type="button"
                aria-label={t("Show {name}'s desk on the plan", { name: nameOf(m) })}
                onClick={() => {
                  spotlightSeat(at.desk.id)
                  onFind()
                }}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-default px-3 text-sm font-bold text-foreground"
              >
                <MapPin className="size-4" /> {t("Find")}
              </button>
            )
          }
        />
      )}
    </div>
  )
}

/** Who's in shown as one list, by team, or just your teams. */
type WhosInView = "everyone" | "teams" | "mine"

/** A team's heading: its colour, name, and how many of it are in that day. */
const TeamHeading = ({
  name,
  color,
  isMine = false,
  inCount,
  total,
}: {
  name: string
  /** None: not a team (those in none). */
  color?: string
  isMine?: boolean
  /** None: just how many. */
  inCount?: number
  total: number
}) => {
  const { t } = useI18n()

  return (
    <>
      {color ? (
        <TeamDot color={color} />
      ) : (
        <span className="size-2.5 shrink-0 rounded-full border-2 border-muted/60" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-black">
        {name}
        {isMine && <span className="font-bold text-muted"> · {t("your team")}</span>}
      </span>
      <span className="shrink-0 text-xs font-extrabold tabular-nums">
        {inCount === undefined ? total : t("{in} of {total}", { in: inCount, total })}
      </span>
      {inCount !== undefined && (
        <span
          aria-hidden
          className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-foreground/10"
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${Math.round((inCount / total) * 100)}%`,
              background: getTeamHex(color ?? ""),
            }}
          />
        </span>
      )}
    </>
  )
}

/**
 * Who's in, as a modal from the rail (desktop): the list, and for admins the
 * way to the people settings.
 */
export const WhosInModal = ({
  me,
  members,
  onClose,
}: {
  me: ShellMember
  members: ShellMember[]
  onClose: () => void
}) => {
  const i18n = useI18n()
  const { t, tn } = i18n
  const { open: openSettings } = useSettings()
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const { byPerson } = useDesksOnDay()
  const inCount = members.filter((member) => byPerson.has(member.userEmail)).length

  return (
    <ColumnPage
      label={t("Who's in")}
      // The news, as a headline: "6 people in."
      title={inCount ? tn(inCount, "{n} person in.", "{n} people in.") : t("Nobody's in.")}
      summary={t("{When}, out of {total} people.", {
        when: dayPhrase(i18n, day, today),
        total: members.length,
      })}
      onClose={onClose}
      actions={
        me.role === Role.ADMIN && (
          <button
            type="button"
            onClick={() => openSettings("org", "members")}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-muted outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Settings2 className="size-4" /> {t("Manage people")}
          </button>
        )
      }
    >
      {/* Find closes it: the desk is on the map behind. */}
      <WhosInList me={me} members={members} onFind={onClose} hasSummary={false} />
    </ColumnPage>
  )
}
