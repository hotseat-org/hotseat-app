import clsx from "clsx"
import { ChevronLeft, Plus, Search, X } from "lucide-react"
import { useMemo, useState } from "react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { usePeople } from "../desks/people"
import { useOfficeStore } from "../store"
import { getZones } from "../zones/zones"
import type { RuleStrength, SeatRule } from "./matching"
import { getRuleIcon, useRuleText } from "./ruleText"
import { useAllPieces } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"

/** Strengths offered for now: avoiding someone comes later (the matching knows it already). */
const OFFERED_STRENGTHS: RuleStrength[] = ["must", "prefer"]

/** People listed at most while choosing a colleague: the search narrows them. */
const MAX_PEOPLE = 8

type RuleKind = SeatRule["kind"]

/** For searching: lower case, without accents. */
const toSearchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/** Whether two rules ask for the same thing (whatever their strength). */
const isSameAsk = (first: SeatRule, second: SeatRule) =>
  JSON.stringify({ ...first, strength: null }) === JSON.stringify({ ...second, strength: null })

/**
 * Your preferences: each with how much it matters (must, or prefer), taken
 * out with its ×, and more added from the kinds there are.
 */
export const Preferences = ({
  rules,
  onChange,
  onDone,
}: {
  rules: SeatRule[]
  onChange: (rules: SeatRule[]) => void
  /** Back to finding a seat, with these. */
  onDone: () => void
}) => {
  const { t } = useI18n()
  const { describe } = useRuleText()
  const [isAdding, setIsAdding] = useState(false)

  if (isAdding)
    return (
      <AddRule
        rules={rules}
        onAdd={(rule) => {
          onChange([...rules.filter((existing) => !isSameAsk(existing, rule)), rule])
          setIsAdding(false)
        }}
        onBack={() => setIsAdding(false)}
      />
    )

  const setStrength = (index: number, strength: RuleStrength) =>
    onChange(rules.map((rule, at) => (at === index ? { ...rule, strength } : rule)))
  const remove = (index: number) => onChange(rules.filter((_, at) => at !== index))

  return (
    <div className="flex flex-col">
      <BackButton label={t("Done")} onPress={onDone} />
      {rules.length === 0 && (
        <p className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm text-muted">
          {t("No preferences yet: any free desk will do.")}
        </p>
      )}
      <ul className="flex flex-col">
        {rules.map((rule, index) => {
          const Icon = getRuleIcon(rule)

          return (
            <li
              key={`${rule.kind}-${index}`}
              className="flex items-center gap-3 border-b border-border/70 py-2.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">
                {describe(rule)}
              </span>
              <StrengthSwitch
                value={rule.strength}
                onChange={(strength) => setStrength(index, strength)}
              />
              <button
                type="button"
                aria-label={t("Remove {preference}", { preference: describe(rule) })}
                onClick={() => remove(index)}
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted outline-none hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="mt-1 flex min-h-12 items-center gap-3 rounded-xl text-[15px] font-extrabold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span className="grid size-10 place-items-center rounded-xl border-[1.5px] border-dashed border-muted/60">
          <Plus className="size-[18px]" />
        </span>
        {t("Add a preference")}
      </button>
    </div>
  )
}

const StrengthSwitch = ({
  value,
  onChange,
}: {
  value: RuleStrength
  onChange: (strength: RuleStrength) => void
}) => {
  const { t } = useI18n()
  const labels: Record<RuleStrength, string> = {
    must: t("Must"),
    prefer: t("Prefer"),
    avoid: t("Avoid"),
  }

  return (
    <span
      role="group"
      aria-label={t("How much it matters")}
      className="flex shrink-0 rounded-full bg-surface-tertiary p-[3px]"
    >
      {OFFERED_STRENGTHS.map((strength) => (
        <button
          key={strength}
          type="button"
          aria-pressed={value === strength}
          onClick={() => onChange(strength)}
          className={clsx(
            "h-8 rounded-full px-2.5 text-xs font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-focus",
            value !== strength && "text-muted",
            value === strength && strength === "must" && "bg-accent text-accent-foreground",
            value === strength && strength === "prefer" && "bg-surface text-accent shadow-sm"
          )}
        >
          {labels[strength]}
        </button>
      ))}
    </span>
  )
}

/** Adding one: its kind first, then what of it (a zone, a person, a feature). */
const AddRule = ({
  rules,
  onAdd,
  onBack,
}: {
  rules: SeatRule[]
  onAdd: (rule: SeatRule) => void
  onBack: () => void
}) => {
  const { t } = useI18n()
  const [kind, setKind] = useState<RuleKind | null>(null)
  const hasFavoriteRule = rules.some((rule) => rule.kind === "favorite")
  const kinds: { kind: RuleKind; title: string; detail: string }[] = [
    { kind: "zone", title: t("A zone"), detail: t("Where your team sits") },
    { kind: "colleague", title: t("Near a colleague"), detail: t("Wherever they sit that day") },
    { kind: "feature", title: t("What the desk has"), detail: t("A standing desk…") },
    ...(hasFavoriteRule
      ? []
      : [
          {
            kind: "favorite" as const,
            title: t("One of my favourites"),
            detail: t("The desks you starred"),
          },
        ]),
  ]

  const back = <BackButton label={t("Back")} onPress={kind ? () => setKind(null) : onBack} />

  if (kind === "zone") return <ZoneChoice back={back} onPick={onAdd} />
  if (kind === "colleague") return <ColleagueChoice back={back} onPick={onAdd} />
  if (kind === "feature") return <FeatureChoice back={back} onPick={onAdd} />

  return (
    <div className="flex flex-col">
      {back}
      <ul className="flex flex-col">
        {kinds.map((entry) => {
          const Icon = getRuleIcon({ kind: entry.kind, strength: "prefer" } as SeatRule)

          return (
            <li key={entry.kind}>
              <button
                type="button"
                onClick={() =>
                  entry.kind === "favorite"
                    ? onAdd({ kind: "favorite", strength: "prefer" })
                    : setKind(entry.kind)
                }
                className="flex min-h-14 w-full items-center gap-3 rounded-xl py-1.5 text-left outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-extrabold">{entry.title}</span>
                  <span className="block text-xs text-muted">{entry.detail}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Back a step, top left: to finding a seat, or to the kinds of preference. */
const BackButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <button
    type="button"
    onClick={onPress}
    className="-ml-2 mb-2 flex min-h-11 items-center gap-1 self-start rounded-full pr-3 text-sm font-extrabold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
  >
    <ChevronLeft className="size-5" />
    {label}
  </button>
)

const CHOICE =
  "min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-bold outline-none hover:border-muted focus-visible:ring-2 focus-visible:ring-focus"

const ZoneChoice = ({
  back,
  onPick,
}: {
  back: React.ReactNode
  onPick: (rule: SeatRule) => void
}) => {
  const { t } = useI18n()
  const pieces = useAllPieces()
  const zones = useMemo(() => getZones(pieces), [pieces])

  return (
    <div className="flex flex-col">
      {back}
      {zones.length === 0 ? (
        <p className="text-sm text-muted">{t("This office has no zones yet.")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {zones.map((zone) => (
            <button
              key={zone.name}
              type="button"
              onClick={() => onPick({ kind: "zone", zone: zone.name, strength: "prefer" })}
              className={clsx(CHOICE, "flex items-center gap-2")}
            >
              <span className="size-2.5 rounded-full" style={{ background: zone.color }} />
              {zone.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const FeatureChoice = ({
  back,
  onPick,
}: {
  back: React.ReactNode
  onPick: (rule: SeatRule) => void
}) => {
  const { t } = useI18n()

  return (
    <div className="flex flex-col">
      {back}
      <div className="flex flex-wrap gap-2">
        {DESK_FEATURES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            onClick={() => onPick({ kind: "feature", feature: feature.id, strength: "prefer" })}
            className={CHOICE}
          >
            {t(feature.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

const ColleagueChoice = ({
  back,
  onPick,
}: {
  back: React.ReactNode
  onPick: (rule: SeatRule) => void
}) => {
  const { t } = useI18n()
  const people = usePeople()
  const me = useOfficeStore((state) => state.booking.me)
  const [query, setQuery] = useState("")
  const searchable = toSearchable(query.trim())
  const listed = people.members
    .filter(
      (member) =>
        member.email !== me &&
        (!searchable ||
          toSearchable(member.name).includes(searchable) ||
          toSearchable(member.email).includes(searchable))
    )
    .slice(0, MAX_PEOPLE)

  return (
    <div className="flex flex-col">
      {back}
      <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-focus">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t("Search by name or email")}
          aria-label={t("Search by name or email")}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
        />
      </label>
      <ul className="mt-2 flex flex-col">
        {listed.map((member) => (
          <li key={member.email}>
            <button
              type="button"
              onClick={() => onPick({ kind: "colleague", email: member.email, strength: "prefer" })}
              className="flex min-h-12 w-full flex-col justify-center rounded-xl px-2 text-left outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="truncate text-[15px] font-extrabold">{member.name}</span>
              <span className="truncate text-xs text-muted">{member.email}</span>
            </button>
          </li>
        ))}
        {listed.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-muted">
            {t("Nobody matches “{query}”", { query: query.trim() })}
          </li>
        )}
      </ul>
    </div>
  )
}
