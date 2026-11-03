import { DESK_FEATURES } from "../desks/deskFeatures"
import { personByEmail, usePeople } from "../desks/people"
import { teamById, useTeams } from "../teams"
import { isAwayRule, type SeatRule } from "./matching"
import { useI18n } from "~/i18n/I18nProvider"

/** Rules' words: what each asks for, and how it went for a desk. */
export const useRuleText = () => {
  const { t } = useI18n()
  const people = usePeople()
  const teams = useTeams()
  const teamNameOf = (id: string) => teamById(teams, id)?.name ?? t("your team")
  const nameOf = (email: string) => personByEmail(people, email)?.name ?? email.split("@")[0]
  const featureOf = (id: string) => {
    const feature = DESK_FEATURES.find((candidate) => candidate.id === id)

    return feature ? t(feature.label) : id
  }

  /** What it asks for, as a list row says it: "Engineering zone", "Near Anna Nováková". */
  const describe = (rule: SeatRule) => {
    if (rule.kind === "zone")
      return isAwayRule(rule)
        ? t("Away from {zone}", { zone: rule.zone })
        : t("{zone} zone", { zone: rule.zone })
    if (rule.kind === "favorite") return t("My preferred seat")
    if (rule.kind === "feature") return featureOf(rule.feature)
    if (rule.kind === "team") return t("With {team}", { team: teamNameOf(rule.teamId) })

    return isAwayRule(rule)
      ? t("Away from {name}", { name: nameOf(rule.email) })
      : t("Near {name}", { name: nameOf(rule.email) })
  }

  /**
   * How it went for a desk, as its checklist says it (`teammates`: those of
   * your teams sitting near it, named for a team rule).
   */
  const describeOutcome = (rule: SeatRule, isMet: boolean, teammates: string[] = []) => {
    if (rule.kind === "zone") {
      // Away from it, met means outside it.
      const isInside = isAwayRule(rule) ? !isMet : isMet

      return isInside
        ? t("In {zone}", { zone: rule.zone })
        : t("Not in {zone}", { zone: rule.zone })
    }
    if (rule.kind === "favorite")
      return isMet ? t("Your preferred seat") : t("Not your preferred seat")
    if (rule.kind === "feature")
      return isMet
        ? featureOf(rule.feature)
        : t("Without: {feature}", { feature: featureOf(rule.feature) })
    if (rule.kind === "team") {
      const team = teamById(teams, rule.teamId)
      const near = teammates.filter((email) => team?.members.includes(email))
      if (!isMet) return t("Not near {team}", { team: teamNameOf(rule.teamId) })
      if (near.length === 0) return t("In {team}'s zone", { team: teamNameOf(rule.teamId) })

      // The team first: it's what was asked for; who of it is near, after.
      return t("With {team}, next to {names}", {
        team: teamNameOf(rule.teamId),
        names: near.map(nameOf).join(", "),
      })
    }

    const name = nameOf(rule.email)
    if (isAwayRule(rule))
      return isMet ? t("Away from {name}", { name }) : t("Near {name}", { name })

    return isMet ? t("Near {name}", { name }) : t("Not near {name}", { name })
  }

  return { describe, describeOutcome }
}
