import { Input, Label, Spinner, TextField } from "@heroui/react"
import clsx from "clsx"
import { ChevronLeft, Plus, Trash2, UsersRound, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useFetcher, useParams } from "react-router"
import { useOrgSettingsData } from "../data"
import { CardTitle, SettingsCard } from "../ui"
import { SettingsFooter } from "../SettingsFooter"
import { useSettings } from "../useSettings"
import { ZonePickerDialog } from "../dialogs/ZonePicker"
import { Button } from "~/components/Button"
import { PeopleSearch, PersonFace, type SearchedPerson } from "~/components/people/PeopleSearch"
import { TeamTile, getTeamTint } from "~/components/teams/teamLook"
import { EmptyState } from "~/components/ui/EmptyState"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"
import type { TeamActionData } from "~/routes/api.settings.org.$slug.teams"
import { ALL_WEEKDAYS } from "~/utils/booking"
import {
  KEEP_DAYS_CHOICES,
  MAX_TEAM_NAME,
  TEAM_COLORS,
  TEAM_COLOR_NAMES,
  type Team,
  type TeamColor,
} from "~/utils/teams"

/** Faces shown in a team's row before "+n". */
const MAX_FACES = 3

const COLOR_LABELS: Record<TeamColor, string> = {
  teal: msg("Teal"),
  denim: msg("Denim"),
  coral: msg("Coral"),
  plum: msg("Plum"),
  amber: msg("Amber"),
  sage: msg("Sage"),
  rose: msg("Rose"),
  slate: msg("Slate"),
}

/** The panel's data (loaded with the page): its teams, the people and each office's zones. */
const useTeamsData = () => {
  const data = useOrgSettingsData("teams")
  if (!data?.teams || !data.teamPeople || !data.teamOffices) return undefined

  return { teams: data.teams, people: data.teamPeople, offices: data.teamOffices }
}

type TeamsData = NonNullable<ReturnType<typeof useTeamsData>>
type OfficeZones = TeamsData["offices"][number]

/** An ISO weekday's short name ("Tue"), as everywhere else. */
const useWeekdayName = () => {
  const { format } = useI18n()
  const names = format.weekShort()

  return (weekday: number) => names[weekday - 1]
}

/**
 * Organization settings → Teams: people who like to sit together. Each team
 * has a colour, a zone in each office, days it comes in together, and its
 * people. The editor opens in place (`?dialog=team:<id>`, `team:new`).
 */
export function OrgTeams() {
  const data = useTeamsData()
  const { dialog, openDialog, closeDialog } = useSettings()

  if (!data)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )

  const editingId = dialog?.startsWith("team:") ? dialog.slice("team:".length) : null
  const editing = data.teams.find((team) => team.id === editingId) ?? null
  if (editingId === "new" || editing)
    return (
      <TeamEditor
        key={editingId}
        team={editing}
        members={data.people}
        offices={data.offices}
        onDone={closeDialog}
      />
    )

  return <TeamList data={data} onOpen={(id) => openDialog(`team:${id}`)} />
}

const TeamList = ({ data, onOpen }: { data: TeamsData; onOpen: (id: string) => void }) => {
  const { t, tn } = useI18n()
  const weekdayName = useWeekdayName()
  const personByEmail = useMemo(
    () => new Map(data.people.map((member) => [member.email, member])),
    [data.people]
  )
  const officeName = (slug: string) => data.offices.find((office) => office.slug === slug)?.name

  if (data.teams.length === 0)
    return (
      <EmptyState
        icon={UsersRound}
        title={t("No teams yet")}
        description={t(
          "Group people who like to sit together. They can find a seat near each other, and see who's in."
        )}
      >
        <Button variant="primary" className="mt-5" onPress={() => onOpen("new")}>
          <Plus className="size-4" /> {t("New team")}
        </Button>
      </EmptyState>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <p className="min-w-0 flex-1 text-sm text-muted">
          {/* The header says what a team is: this, what it doesn't. */}
          {t("Someone can be in more than one team.")}
        </p>
        <Button variant="primary" size="sm" onPress={() => onOpen("new")}>
          <Plus className="size-4" /> {t("New team")}
        </Button>
      </div>

      <ul
        aria-label={t("Teams")}
        className="flex flex-col divide-y divide-separator rounded-2xl border border-border bg-surface"
      >
        {data.teams.map((team) => {
          const faces = team.members.slice(0, MAX_FACES).flatMap((email) => {
            const person = personByEmail.get(email)

            return person ? [person] : []
          })
          const [firstZone, ...otherZones] = team.zones

          return (
            <li key={team.id}>
              <button
                type="button"
                onClick={() => onOpen(team.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
              >
                <TeamTile name={team.name} color={team.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-foreground">
                    {team.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {tn(team.members.length, "{n} person", "{n} people")}
                    {firstZone &&
                      ` · ${firstZone.zone}, ${officeName(firstZone.officeSlug) ?? ""}${
                        otherZones.length
                          ? ` ${tn(otherZones.length, "+ {n} office", "+ {n} offices")}`
                          : ""
                      }`}
                  </span>
                </span>
                <span className="hidden shrink-0 sm:flex">
                  {faces.map((person) => (
                    <PersonFace
                      key={person.email}
                      person={person}
                      className="-ml-2 size-7 text-[11px] ring-2 ring-surface first:ml-0"
                    />
                  ))}
                  {team.members.length > MAX_FACES && (
                    <span className="-ml-2 grid size-7 place-items-center rounded-full bg-default text-[10px] font-extrabold text-muted ring-2 ring-surface">
                      +{team.members.length - MAX_FACES}
                    </span>
                  )}
                </span>
                <span className="hidden w-28 shrink-0 justify-end gap-1 md:flex">
                  {team.weekdays.length === 0 ? (
                    <span className="text-xs text-muted">{t("Any day")}</span>
                  ) : (
                    team.weekdays.map((weekday) => (
                      <span
                        key={weekday}
                        className="rounded-full px-2 py-1 text-[11px] font-extrabold"
                        style={getTeamTint(team.color)}
                      >
                        {weekdayName(weekday)}
                      </span>
                    ))
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface ZoneChoice {
  zone: string
  keepDays: number | null
}

const TeamEditor = ({
  team,
  members,
  offices,
  onDone,
}: {
  /** None: a new team. */
  team: Team | null
  members: SearchedPerson[]
  offices: OfficeZones[]
  onDone: () => void
}) => {
  const { slug } = useParams()
  const { t, tn } = useI18n()
  const weekdayName = useWeekdayName()
  const fetcher = useFetcher<TeamActionData>()
  const [name, setName] = useState(team?.name ?? "")
  const [color, setColor] = useState<TeamColor>(team?.color ?? "teal")
  const [weekdays, setWeekdays] = useState(team?.weekdays ?? [])
  const [people, setPeople] = useState(() => new Set(team?.members ?? []))
  const [zones, setZones] = useState<Record<string, ZoneChoice>>(() =>
    Object.fromEntries(
      (team?.zones ?? []).map((zone) => [
        zone.officeSlug,
        { zone: zone.zone, keepDays: zone.keepDays },
      ])
    )
  )
  const [isDeleting, setIsDeleting] = useState(false)
  // Choosing a zone: for another office (no slug), or a new one for this office.
  const [picking, setPicking] = useState<{ officeSlug?: string } | null>(null)
  // Offices it could sit in too: with zones, and none of them its yet.
  const addable = offices.filter((office) => office.zones.length > 0 && !zones[office.slug])

  // Saved (or deleted): back to the list.
  const result = fetcher.state === "idle" ? fetcher.data : undefined
  useEffect(() => {
    if (result?.ok) onDone()
  }, [result, onDone])

  const action = `/api/settings/org/${slug}/teams`
  const save = () =>
    fetcher.submit(
      {
        intent: "save",
        team: JSON.stringify({
          id: team?.id,
          name,
          color,
          weekdays,
          members: [...people],
          zones: Object.entries(zones).map(([officeSlug, choice]) => ({ officeSlug, ...choice })),
        }),
      },
      { method: "post", action }
    )
  const remove = () =>
    team && fetcher.submit({ intent: "delete", id: team.id }, { method: "post", action })

  const toggleWeekday = (weekday: number) =>
    setWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((day) => day !== weekday)
        : [...current, weekday].sort()
    )
  const togglePerson = (email: string) =>
    setPeople((current) => {
      const next = new Set(current)
      if (next.has(email)) next.delete(email)
      else next.add(email)

      return next
    })
  const setZone = (officeSlug: string, choice: ZoneChoice | null) =>
    setZones((current) => {
      const next = { ...current }
      if (choice) next[officeSlug] = choice
      else delete next[officeSlug]

      return next
    })

  const isPending = fetcher.state !== "idle"

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onDone}
        className="-ml-2 flex min-h-11 items-center gap-1 self-start rounded-full pr-3 text-sm font-extrabold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ChevronLeft className="size-5" /> {t("Teams")}
      </button>

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard className="flex flex-col gap-5">
          <div className="flex items-end gap-3">
            <TeamTile name={name || "?"} color={color} className="size-14 rounded-2xl text-lg" />
            <TextField
              isRequired
              value={name}
              onChange={setName}
              maxLength={MAX_TEAM_NAME}
              className="min-w-0 flex-1"
            >
              <Label>{t("Name")}</Label>
              <Input placeholder={t("e.g. Design")} />
            </TextField>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">{t("Colour")}</h3>
            <div role="radiogroup" aria-label={t("Colour")} className="flex flex-wrap gap-2.5">
              {TEAM_COLOR_NAMES.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  role="radio"
                  aria-checked={candidate === color}
                  aria-label={t(COLOR_LABELS[candidate])}
                  onClick={() => setColor(candidate)}
                  className={clsx(
                    "size-7 rounded-full outline-none ring-offset-2 ring-offset-surface-secondary focus-visible:ring-2 focus-visible:ring-focus",
                    candidate === color && "ring-2 ring-foreground/70"
                  )}
                  style={{ background: TEAM_COLORS[candidate] }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">{t("Where they sit")}</h3>
            {Object.keys(zones).length > 0 && (
              <ul className="flex flex-col gap-2">
                {Object.entries(zones).map(([officeSlug, choice]) => (
                  <ZoneCard
                    key={officeSlug}
                    office={offices.find((office) => office.slug === officeSlug)}
                    officeSlug={officeSlug}
                    choice={choice}
                    onChange={(next) => setZone(officeSlug, next)}
                    onChangeZone={() => setPicking({ officeSlug })}
                  />
                ))}
              </ul>
            )}
            {addable.length > 0 ? (
              <button
                type="button"
                onClick={() => setPicking({})}
                className="flex min-h-12 items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border px-3 text-sm font-extrabold text-accent outline-none transition-colors hover:border-accent/60 hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Plus className="size-[18px]" />
                {Object.keys(zones).length > 0
                  ? t("Add a zone in another office")
                  : t("Add a zone")}
              </button>
            ) : (
              Object.keys(zones).length === 0 && (
                <p className="text-sm text-muted">{t("No office has zones yet.")}</p>
              )
            )}
            {picking && (
              <ZonePickerDialog
                offices={
                  picking.officeSlug
                    ? offices.filter((office) => office.slug === picking.officeSlug)
                    : addable
                }
                chosen={
                  picking.officeSlug && zones[picking.officeSlug]
                    ? { officeSlug: picking.officeSlug, zone: zones[picking.officeSlug].zone }
                    : undefined
                }
                onPick={(officeSlug, zone) => {
                  setZone(officeSlug, { zone, keepDays: zones[officeSlug]?.keepDays ?? null })
                  setPicking(null)
                }}
                onClose={() => setPicking(null)}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">{t("Team days")}</h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Team days")}>
              {ALL_WEEKDAYS.slice(0, 5).map((weekday) => (
                <button
                  key={weekday}
                  type="button"
                  aria-pressed={weekdays.includes(weekday)}
                  onClick={() => toggleWeekday(weekday)}
                  className={clsx(
                    "min-h-10 min-w-14 rounded-xl border px-3 text-sm font-bold transition-colors",
                    weekdays.includes(weekday)
                      ? "border-transparent"
                      : "border-border text-muted hover:text-foreground"
                  )}
                  style={weekdays.includes(weekday) ? getTeamTint(color) : undefined}
                >
                  {weekdayName(weekday)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {t("The days you come in together. Members see them when they pick a day.")}
            </p>
          </div>
        </SettingsCard>

        <SettingsCard className="flex min-h-0 flex-col gap-3">
          <CardTitle>{tn(people.size, "{n} person", "{n} people")}</CardTitle>
          <PeopleSearch
            items={members}
            getPerson={(member) => member}
            filters={[
              { id: "team", label: t("In the team"), isIn: (member) => people.has(member.email) },
              { id: "everyone", label: t("Everyone"), isIn: () => true },
            ]}
            initialFilter={team && team.members.length > 0 ? "team" : "everyone"}
            sort={(first, second) => first.name.localeCompare(second.name)}
            isSelected={(member) => people.has(member.email)}
            onPick={(member) => togglePerson(member.email)}
            className="h-[420px]"
          />
        </SettingsCard>
      </div>

      {/* Pinned under the panel: in view however long the team. */}
      <SettingsFooter>
        <footer className="flex flex-wrap items-center gap-3 border-t border-separator bg-surface-secondary px-4 py-3 md:px-9 md:py-4">
          {team &&
            (isDeleting ? (
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {t("Delete {name}?", { name: team.name })}
                </span>
                <Button variant="danger" size="sm" onPress={remove} isPending={isPending}>
                  {t("Delete")}
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setIsDeleting(false)}>
                  {t("Keep")}
                </Button>
              </span>
            ) : (
              <Button variant="ghost" className="text-danger" onPress={() => setIsDeleting(true)}>
                <Trash2 className="size-4" /> {t("Delete team")}
              </Button>
            ))}
          <p
            role="alert"
            className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-danger"
          >
            {result?.ok === false ? result.error : ""}
          </p>
          <Button variant="ghost" onPress={onDone} isDisabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button variant="primary" onPress={save} isPending={isPending} isDisabled={!name.trim()}>
            {t("Save")}
          </Button>
        </footer>
      </SettingsFooter>
    </div>
  )
}

/**
 * A zone the team has, as a card: the zone in its colour, its office, a way to
 * change or drop it — and whether it's kept for the team, and until when.
 */
const ZoneCard = ({
  office,
  officeSlug,
  choice,
  onChange,
  onChangeZone,
}: {
  /** None: the office is gone (its zone still shown, so it isn't lost by accident). */
  office?: OfficeZones
  officeSlug: string
  choice: ZoneChoice
  /** None: the team has no zone there any more. */
  onChange: (choice: ZoneChoice | null) => void
  onChangeZone: () => void
}) => {
  const { t, tn } = useI18n()
  const zone = office?.zones.find((candidate) => candidate.name === choice.zone)
  const color = zone?.color ?? "var(--muted)"
  const officeName = office?.name ?? officeSlug
  const isKept = choice.keepDays !== null

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 p-3">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${color} 22%, transparent)` }}
        >
          <span className="size-3.5 rounded-full" style={{ background: color }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-black">{choice.zone}</span>
          <span className="block truncate text-xs text-muted">
            {zone
              ? `${officeName} · ${tn(zone.deskCount, "{n} desk", "{n} desks")}`
              : `${officeName} · ${t("This zone is no longer on the plan")}`}
          </span>
        </span>
        {office && (
          <Button variant="ghost" size="sm" onPress={onChangeZone}>
            {t("Change")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={t("Remove the zone in {office}", { office: officeName })}
          onPress={() => onChange(null)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-separator bg-surface-secondary/60 px-3 py-3">
        <div
          role="radiogroup"
          aria-label={t("Who can book its desks")}
          className="grid grid-cols-2 rounded-xl bg-surface-tertiary p-[3px]"
        >
          {[false, true].map((option) => (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={isKept === option}
              onClick={() =>
                onChange({
                  ...choice,
                  keepDays: option ? (choice.keepDays ?? KEEP_DAYS_CHOICES[1]) : null,
                })
              }
              className={clsx(
                "min-h-9 rounded-[10px] px-2 text-xs font-extrabold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                isKept === option
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              {option ? t("Kept for the team") : t("Open to everyone")}
            </button>
          ))}
        </div>
        {/* Reserved: the card keeps its height either way. */}
        <div className="flex min-h-9 items-center gap-2">
          {isKept ? (
            <>
              <span className="min-w-0 flex-1 text-xs font-bold text-muted">
                {t("Others can book")}
              </span>
              <span
                role="radiogroup"
                aria-label={t("Days before")}
                className="flex rounded-full bg-surface-tertiary p-[3px]"
              >
                {KEEP_DAYS_CHOICES.map((days) => (
                  <button
                    key={days}
                    type="button"
                    role="radio"
                    aria-checked={choice.keepDays === days}
                    aria-label={tn(days, "{n} day before", "{n} days before")}
                    onClick={() => onChange({ ...choice, keepDays: days })}
                    className={clsx(
                      "size-7 rounded-full text-xs font-extrabold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                      choice.keepDays === days
                        ? "bg-accent text-accent-foreground"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {days}
                  </button>
                ))}
              </span>
              <span className="shrink-0 text-xs font-bold text-muted">{t("days before")}</span>
            </>
          ) : (
            <span className="text-xs text-muted">{t("Anyone can book its desks any time.")}</span>
          )}
        </div>
      </div>
    </li>
  )
}
