import { z } from "zod"
import type { SeatRule } from "./matching"

/** Rules kept at most (each office): a search, not a list. */
export const MAX_SEAT_RULES = 12

const strength = z.enum(["must", "prefer"])
const name = z.string().min(1).max(200)
const isAway = z.boolean().optional()

/**
 * Kept before "away" had a strength of its own: `strength: "avoid"` — an away
 * preference (it never ruled a desk out). Read as one; other kinds can't be away.
 */
const fromOldAvoid = (rule: unknown) => {
  if (typeof rule !== "object" || rule === null || !("strength" in rule)) return rule
  if (rule.strength !== "avoid") return rule

  const kind = "kind" in rule ? rule.kind : null

  return kind === "zone" || kind === "colleague"
    ? { ...rule, strength: "prefer", isAway: true }
    : null
}

/**
 * A finding-a-seat rule, checked — sent to the server, or read back from it
 * (an older shape is brought up to date; one edited by hand is left out).
 */
export const seatRuleSchema: z.ZodType<SeatRule> = z.preprocess(
  fromOldAvoid,
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("zone"), zone: name, strength, isAway }),
    z.object({ kind: z.literal("favorite"), strength }),
    z.object({ kind: z.literal("colleague"), email: name, strength, isAway }),
    z.object({ kind: z.literal("feature"), feature: name, strength }),
  ])
) as unknown as z.ZodType<SeatRule>

/** Someone's rules as kept: the valid ones, at most MAX_SEAT_RULES (none: no rules). */
export const parseSeatRules = (value: unknown): SeatRule[] =>
  Array.isArray(value)
    ? value
        .flatMap((rule) => {
          const parsed = seatRuleSchema.safeParse(rule)

          return parsed.success ? [parsed.data] : []
        })
        .slice(0, MAX_SEAT_RULES)
    : []
