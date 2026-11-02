import clsx from "clsx"
import { Check, ChevronLeft, Minus, Plus, Search, X } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { usePeople } from "../desks/people"
import { useOfficeStore } from "../store"
import { getZones } from "../zones/zones"
import type { RuleStrength, SeatMatch, SeatRule } from "./matching"
import { getRuleIcon, useRuleText } from "./ruleText"
import { useAllPieces } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Strengths offered for now: avoiding someone comes later (the matching knows it already). */
const OFFERED_STRENGTHS: RuleStrength[] = ["must", "prefer"]

/** People listed at most while choosing a colleague: the search narrows them. */
const MAX_PEOPLE = 8

/** "Any day" — I don't mind when — instead of a day. */
export const ANY_DAY = "any"

export type When = Day | typeof ANY_DAY

export const PRIMARY_BUTTON =
  "min-h-12 rounded-full bg-accent px-5 text-[15px] font-black text-accent-foreground outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
export const SECONDARY_BUTTON =
  "min-h-12 rounded-full border border-border bg-surface px-5 text-[15px] font-extrabold text-foreground outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
export const SECTION_TITLE = "text-xs font-extrabold uppercase tracking-[0.06em] text-muted"

/** For searching: lower case, without accents ("Šťastná" is found by "stastna"). */
const toSearchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/** Whether two rules ask for the same thing (whatever their strength). */
const isSameAsk = (first: SeatRule, second: SeatRule) =>
  JSON.stringify({ ...first, strength: null }) === JSON.stringify({ ...second, strength: null })

/** The rules with `rule` added — in place of one asking the same. */
export const addRule = (rules: SeatRule[], rule: SeatRule) => [
  ...rules.filter((existing) => !isSameAsk(existing, rule)),
  rule,
]

/** A rule's tile colours, by its kind: places blue, people green, favourites and avoiding amber. */
const getTileClass = (rule: Pick<SeatRule, "kind" | "strength">) => {
  if (rule.strength === "avoid" || rule.kind === "favorite")
    return "bg-warning/30 text-warning-foreground"
  if (rule.kind === "colleague") return "bg-success/20 text-success-foreground"

  return "bg-accent/15 text-accent"
}

export const RuleTile = ({
  rule,
  size = "md",
}: {
  rule: Pick<SeatRule, "kind" | "strength">
  size?: "sm" | "md"
}) => {
  const Icon = getRuleIcon(rule as SeatRule)

  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center",
        size === "md" ? "size-10 rounded-xl" : "size-9 rounded-[10px]",
        getTileClass(rule)
      )}
    >
      <Icon className="size-[18px]" />
    </span>
  )
}

/** "Today", "Tomorrow", else "Wed 4": the day chips' words. */
export const useDayLabel = () => {
  const { t, format } = useI18n()
  const today = useOfficeStore((state) => state.booking.today)

  return (day: Day, dayChoices: Day[]) => {
    if (day === today) return t("Today")
    if (dayChoices[0] === today && day === dayChoices[1]) return t("Tomorrow")

    return format.short(day)
  }
}

/** The days to pick from, as chips — the chosen one filled. */
export const DayChips = ({
  days,
  value,
  onChange,
  isDark = false,
  isWrapping = false,
}: {
  days: Day[]
  value: When
  onChange: (day: Day) => void
  /** Chosen in the foreground colour (the shortcuts' strip) rather than the accent. */
  isDark?: boolean
  isWrapping?: boolean
}) => {
  const { t } = useI18n()
  const dayLabel = useDayLabel()

  return (
    <div
      role="group"
      aria-label={t("Day")}
      className={clsx("flex gap-2", isWrapping ? "flex-wrap" : "-mx-1 overflow-x-auto px-1 pb-0.5")}
    >
      {days.map((day) => (
        <button
          key={day}
          type="button"
          aria-pressed={value === day}
          onClick={() => onChange(day)}
          className={clsx(
            "min-h-10 shrink-0 rounded-full border px-3.5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
            value !== day && "border-border bg-surface text-foreground hover:border-muted",
            value === day && isDark && "border-foreground bg-foreground text-background",
            value === day && !isDark && "border-accent bg-accent text-accent-foreground"
          )}
        >
          {dayLabel(day, days)}
        </button>
      ))}
    </div>
  )
}

/** How much a rule matters: Must or Prefer. */
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

/**
 * Your preferences, one per row: what it asks (and of what kind), how much
 * it matters, and its × — then "Add a preference".
 */
export const RuleRows = ({
  rules,
  onChange,
  onAdd,
  hasKinds = true,
}: {
  rules: SeatRule[]
  onChange: (rules: SeatRule[]) => void
  onAdd: () => void
  /** Under each, its kind ("Zone", "Colleague"): roomy lists only. */
  hasKinds?: boolean
}) => {
  const { t } = useI18n()
  const { describe, describeKind } = useRuleText()
  const setStrength = (index: number, strength: RuleStrength) =>
    onChange(rules.map((rule, at) => (at === index ? { ...rule, strength } : rule)))
  const remove = (index: number) => onChange(rules.filter((_, at) => at !== index))

  return (
    <div className="flex flex-col">
      {rules.length === 0 && (
        <p className="py-2 text-sm text-muted">{t("No preferences yet: any free desk will do.")}</p>
      )}
      <ul className="flex flex-col">
        {rules.map((rule, index) => (
          <li
            key={`${rule.kind}-${index}`}
            className="flex items-center gap-3 border-b border-border/70 py-2.5"
          >
            <RuleTile rule={rule} size={hasKinds ? "md" : "sm"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-extrabold">{describe(rule)}</span>
              {hasKinds && (
                <span className="block truncate text-xs text-muted">{describeKind(rule)}</span>
              )}
            </span>
            <StrengthSwitch
              value={rule.strength}
              onChange={(strength) => setStrength(index, strength)}
            />
            <button
              type="button"
              aria-label={t("Remove {preference}", { preference: describe(rule) })}
              onClick={() => remove(index)}
              className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted outline-none hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1 flex min-h-14 items-center gap-3 self-start rounded-xl pr-2 text-[15px] font-extrabold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span className="grid size-10 place-items-center rounded-xl border-[1.5px] border-dashed border-muted/60">
          <Plus className="size-[18px]" />
        </span>
        {t("Add a preference")}
      </button>
    </div>
  )
}

/** A rule's outcome for a desk: ticked when met, a dash when not. */
export const Checklist = ({ match }: { match: SeatMatch }) => {
  const { describeOutcome } = useRuleText()

  return (
    <ul className="flex flex-col">
      {match.met.map((rule, index) => (
        <li key={`met-${index}`} className="flex items-center gap-2.5 py-1.5 text-sm font-bold">
          <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-success text-success-foreground">
            <Check className="size-3" strokeWidth={3.4} />
          </span>
          {describeOutcome(rule, true)}
        </li>
      ))}
      {match.missed.map((rule, index) => (
        <li
          key={`missed-${index}`}
          className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-muted"
        >
          <span className="grid size-[22px] shrink-0 place-items-center rounded-full border-2 border-muted/60">
            <Minus className="size-3" strokeWidth={3.4} />
          </span>
          {describeOutcome(rule, false)}
        </li>
      ))}
    </ul>
  )
}

type PickerStep = "kinds" | "zone" | "colleague" | "feature"

/**
 * Adding a preference: every kind there is, grouped — where (a zone, what
 * the desk has), who (a colleague) and the desk (your favourites) — found
 * by search too; then which zone, person or feature.
 */
export const AddPreference = ({
  rules,
  onAdd,
  onBack,
}: {
  rules: SeatRule[]
  onAdd: (rule: SeatRule) => void
  onBack: () => void
}) => {
  const { t } = useI18n()
  const [step, setStep] = useState<PickerStep>("kinds")
  const [query, setQuery] = useState("")
  const pieces = useAllPieces()
  const zones = useMemo(() => getZones(pieces), [pieces])
  const people = usePeople()
  const me = useOfficeStore((state) => state.booking.me)
  const favorites = useOfficeStore((state) => state.booking.preferences.favorites)
  const searchable = toSearchable(query.trim())
  const hasFavoriteRule = rules.some((rule) => rule.kind === "favorite")

  const back = (
    <button
      type="button"
      onClick={step === "kinds" ? onBack : () => setStep("kinds")}
      className="-ml-2 flex min-h-11 items-center gap-1 self-start rounded-full pr-3 text-sm font-extrabold text-accent outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <ChevronLeft className="size-5" />
      {t("Back")}
    </button>
  )

  if (step === "zone")
    return (
      <Choices back={back} title={t("A zone")}>
        {zones.length === 0 && (
          <p className="text-sm text-muted">{t("This office has no zones yet.")}</p>
        )}
        {zones.map((zone) => (
          <ChoiceChip
            key={zone.name}
            onPress={() => onAdd({ kind: "zone", zone: zone.name, strength: "prefer" })}
          >
            <span className="size-2.5 rounded-full" style={{ background: zone.color }} />
            {zone.name}
          </ChoiceChip>
        ))}
      </Choices>
    )

  if (step === "feature")
    return (
      <Choices back={back} title={t("What the desk has")}>
        {DESK_FEATURES.map((feature) => (
          <ChoiceChip
            key={feature.id}
            onPress={() => onAdd({ kind: "feature", feature: feature.id, strength: "prefer" })}
          >
            {t(feature.label)}
          </ChoiceChip>
        ))}
      </Choices>
    )

  if (step === "colleague") {
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
      <div className="flex flex-col gap-2">
        {back}
        <SearchField value={query} onChange={setQuery} placeholder={t("Search by name or email")} />
        <ul className="flex flex-col">
          {listed.map((member) => (
            <li key={member.email}>
              <button
                type="button"
                onClick={() =>
                  onAdd({ kind: "colleague", email: member.email, strength: "prefer" })
                }
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

  const groups: {
    title: string
    kinds: {
      step: PickerStep | "favorite"
      kind: SeatRule["kind"]
      title: string
      detail: string
    }[]
  }[] = [
    {
      title: t("Where"),
      kinds: [
        {
          step: "zone",
          kind: "zone",
          title: t("A zone"),
          detail: zones.map((zone) => zone.name).join(", ") || t("Where your team sits"),
        },
        {
          step: "feature",
          kind: "feature",
          title: t("What the desk has"),
          detail: t("A standing desk…"),
        },
      ],
    },
    {
      title: t("Who"),
      kinds: [
        {
          step: "colleague",
          kind: "colleague",
          title: t("Near a colleague"),
          detail: t("Wherever they sit that day"),
        },
      ],
    },
    ...(hasFavoriteRule
      ? []
      : [
          {
            title: t("The desk"),
            kinds: [
              {
                step: "favorite" as const,
                kind: "favorite" as const,
                title: t("One of my favourites"),
                detail: favorites.length
                  ? t("The desks you starred")
                  : t("Star desks on the plan to add favourites"),
              },
            ],
          },
        ]),
  ]
  const shownGroups = groups
    .map((group) => ({
      ...group,
      kinds: group.kinds.filter(
        (kind) =>
          !searchable ||
          toSearchable(kind.title).includes(searchable) ||
          toSearchable(kind.detail).includes(searchable)
      ),
    }))
    .filter((group) => group.kinds.length > 0)

  return (
    <div className="flex flex-col gap-1">
      {back}
      <SearchField value={query} onChange={setQuery} placeholder={t("A zone, a person…")} />
      {shownGroups.map((group) => (
        <section key={group.title} className="flex flex-col">
          <h3 className={clsx(SECTION_TITLE, "pb-1.5 pt-3.5")}>{group.title}</h3>
          {group.kinds.map((kind) => (
            <button
              key={kind.title}
              type="button"
              onClick={() =>
                kind.step === "favorite"
                  ? onAdd({ kind: "favorite", strength: "prefer" })
                  : setStep(kind.step)
              }
              className="flex min-h-14 w-full items-center gap-3 rounded-xl py-1.5 text-left outline-none hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
            >
              <RuleTile rule={{ kind: kind.kind, strength: "prefer" }} />
              <span className="min-w-0">
                <span className="block text-[15px] font-extrabold">{kind.title}</span>
                <span className="block truncate text-xs text-muted">{kind.detail}</span>
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}

const SearchField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => (
  <label className="flex h-11 items-center gap-2 rounded-xl bg-surface-tertiary px-3.5 focus-within:ring-2 focus-within:ring-focus">
    <Search className="size-[18px] shrink-0 text-muted" />
    <input
      autoFocus
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
    />
  </label>
)

const Choices = ({
  back,
  title,
  children,
}: {
  back: ReactNode
  title: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-2">
    {back}
    <h3 className={SECTION_TITLE}>{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

const ChoiceChip = ({ onPress, children }: { onPress: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onPress}
    className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-bold outline-none hover:border-muted focus-visible:ring-2 focus-visible:ring-focus"
  >
    {children}
  </button>
)
