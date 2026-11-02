import clsx from "clsx"
import { ChevronLeft, Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { usePeople } from "../desks/people"
import { useOfficeStore } from "../store"
import { getZones } from "../zones/zones"
import type { RuleStrength, SeatRule } from "./matching"
import { KindTile, RuleTile, TONES, getZoneTint } from "./ruleLook"
import { useRuleText } from "./ruleText"
import { PeopleSearch } from "~/components/people/PeopleSearch"
import { useAllPieces } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"

/** How much a preference matters. */
const OFFERED_STRENGTHS: RuleStrength[] = ["must", "prefer"]

/** People listed at most while choosing a colleague: the search narrows them. */
const MAX_PEOPLE = 8

type RuleKind = SeatRule["kind"]

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
  /** Back to finding a seat, with these (none: they're edited beside the result). */
  onDone?: () => void
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
      {onDone && <BackButton label={t("Done")} onPress={onDone} />}
      {rules.length === 0 && (
        <p className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm text-muted">
          {t("No preferences yet: any free desk will do.")}
        </p>
      )}
      <ul className="flex flex-col">
        {rules.map((rule, index) => (
          <li
            key={`${rule.kind}-${index}`}
            className="flex items-center gap-3 border-b border-border/70 py-2.5"
          >
            <RuleTile rule={rule} />
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
        ))}
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
  const [kind, setKind] = useState<RuleKind | "away" | "away-zone" | null>(null)
  const favorites = useOfficeStore((state) => state.booking.preferences.favorites)
  // Your preferred seats: the desks you starred — none starred, nothing to prefer.
  const canPreferSeat = favorites.length > 0 && !rules.some((rule) => rule.kind === "favorite")
  const kinds: { kind: RuleKind | "away" | "away-zone"; title: string; detail: string }[] = [
    { kind: "zone", title: t("A zone"), detail: t("Where your team sits") },
    { kind: "away-zone", title: t("Away from a zone"), detail: t("A part of the office to avoid") },
    { kind: "colleague", title: t("Near a colleague"), detail: t("Wherever they sit that day") },
    {
      kind: "away",
      title: t("Away from a colleague"),
      detail: t("Only you see this"),
    },
    { kind: "feature", title: t("What the desk has"), detail: t("A standing desk…") },
    ...(canPreferSeat
      ? [
          {
            kind: "favorite" as const,
            title: t("My preferred seat"),
            detail: t("The desks you starred"),
          },
        ]
      : []),
  ]

  const back = <BackButton label={t("Back")} onPress={kind ? () => setKind(null) : onBack} />

  if (kind === "zone") return <ZoneChoice back={back} onPick={onAdd} />
  if (kind === "away-zone") return <ZoneChoice back={back} onPick={onAdd} isAway />
  if (kind === "colleague") return <ColleagueChoice back={back} onPick={onAdd} />
  if (kind === "away") return <ColleagueChoice back={back} onPick={onAdd} isAway />
  if (kind === "feature") return <FeatureChoice back={back} onPick={onAdd} />

  return (
    <div className="flex flex-col">
      {back}
      <ul className="flex flex-col">
        {kinds.map((entry) => (
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
              <EntryTile kind={entry.kind} />
              <span className="min-w-0">
                <span className="block text-[15px] font-extrabold">{entry.title}</span>
                <span className="block text-xs text-muted">{entry.detail}</span>
              </span>
            </button>
          </li>
        ))}
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

/** A choice's shape; its colours are the preference's own (see ruleLook). */
const CHOICE =
  "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-focus"

/** A kind to add, by its tile: the away ones in red. */
const EntryTile = ({ kind }: { kind: RuleKind | "away" | "away-zone" }) => {
  if (kind === "away") return <KindTile kind="colleague" isAway />
  if (kind === "away-zone") return <KindTile kind="zone" isAway />

  return <KindTile kind={kind} />
}

const ZoneChoice = ({
  back,
  onPick,
  isAway = false,
}: {
  back: React.ReactNode
  onPick: (rule: SeatRule) => void
  /** A zone to keep away from, not to sit in. */
  isAway?: boolean
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
              onClick={() => onPick({ kind: "zone", zone: zone.name, strength: "prefer", isAway })}
              className={clsx(CHOICE, TONES.neutral)}
              style={getZoneTint(zone.color)}
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
            className={clsx(CHOICE, TONES.accent)}
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
  isAway = false,
}: {
  back: React.ReactNode
  onPick: (rule: SeatRule) => void
  /** Someone to sit away from, not near. */
  isAway?: boolean
}) => {
  const people = usePeople()
  const me = useOfficeStore((state) => state.booking.me)
  const others = useMemo(
    () => people.members.filter((member) => member.email !== me),
    [people.members, me]
  )

  return (
    <div className="flex flex-col">
      {back}
      <PeopleSearch
        items={others}
        getPerson={(member) => member}
        sort={(first, second) => first.name.localeCompare(second.name)}
        maxRows={MAX_PEOPLE}
        isAutoFocused
        onPick={(member) =>
          onPick({ kind: "colleague", email: member.email, strength: "prefer", isAway })
        }
      />
    </div>
  )
}
