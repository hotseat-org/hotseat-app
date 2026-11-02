import { z } from "zod"
import type { SeatRule } from "./matching"

/** Rules kept at most (each office): a search, not a list. */
export const MAX_SEAT_RULES = 12

const strength = z.enum(["must", "prefer", "avoid"])
const name = z.string().min(1).max(200)

/**
 * A finding-a-seat rule, checked — sent to the server, or read back from it
 * (an older shape, or one edited by hand, is left out).
 */
export const seatRuleSchema: z.ZodType<SeatRule> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("zone"), zone: name, strength }),
  z.object({ kind: z.literal("favorite"), strength }),
  z.object({ kind: z.literal("colleague"), email: name, strength }),
  z.object({ kind: z.literal("feature"), feature: name, strength }),
])

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
