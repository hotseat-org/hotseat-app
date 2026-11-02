import { Ban, Layers, SlidersHorizontal, Star, UserRound, type LucideIcon } from "lucide-react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { personByEmail, usePeople } from "../desks/people"
import type { SeatRule } from "./matching"
import { useI18n } from "~/i18n/I18nProvider"

/** A rule's icon, by what it asks for (avoiding someone: a no-entry sign). */
export const getRuleIcon = (rule: SeatRule): LucideIcon => {
  if (rule.strength === "avoid") return Ban
  if (rule.kind === "zone") return Layers
  if (rule.kind === "favorite") return Star
  if (rule.kind === "colleague") return UserRound

  return SlidersHorizontal
}

/** Rules' words: what each asks for, and how it went for a desk. */
export const useRuleText = () => {
  const { t } = useI18n()
  const people = usePeople()
  const nameOf = (email: string) => personByEmail(people, email)?.name ?? email.split("@")[0]
  const featureOf = (id: string) => {
    const feature = DESK_FEATURES.find((candidate) => candidate.id === id)

    return feature ? t(feature.label) : id
  }

  /** What it asks for, as a list row says it: "Engineering zone", "Near Anna Nováková". */
  const describe = (rule: SeatRule) => {
    if (rule.kind === "zone") return t("{zone} zone", { zone: rule.zone })
    if (rule.kind === "favorite") return t("My preferred seat")
    if (rule.kind === "feature") return featureOf(rule.feature)

    return rule.strength === "avoid"
      ? t("Away from {name}", { name: nameOf(rule.email) })
      : t("Near {name}", { name: nameOf(rule.email) })
  }

  /** How it went for a desk, as its checklist says it. */
  const describeOutcome = (rule: SeatRule, isMet: boolean) => {
    if (rule.kind === "zone")
      return isMet ? t("In {zone}", { zone: rule.zone }) : t("Not in {zone}", { zone: rule.zone })
    if (rule.kind === "favorite")
      return isMet ? t("Your preferred seat") : t("Not your preferred seat")
    if (rule.kind === "feature")
      return isMet
        ? featureOf(rule.feature)
        : t("Without: {feature}", { feature: featureOf(rule.feature) })

    const name = nameOf(rule.email)
    if (rule.strength === "avoid")
      return isMet ? t("Away from {name}", { name }) : t("Near {name}", { name })

    return isMet ? t("Near {name}", { name }) : t("Not near {name}", { name })
  }

  return { describe, describeOutcome }
}
