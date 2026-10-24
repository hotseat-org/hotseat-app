import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { ReservationError, ReservationRaceError } from "~/core/reservation/types"
import { getTranslator } from "~/i18n/locale.server"
import { translateError } from "~/i18n/errors"
import { msg } from "~/i18n/msg"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const datesSchema = z.preprocess(
  (v) => (typeof v === "string" ? JSON.parse(v) : v),
  z.array(z.string()).min(1)
)

// Days per desk: a custom booking can put taken days on another desk.
const picksSchema = z.preprocess(
  (v) => (typeof v === "string" ? JSON.parse(v) : v),
  z
    .array(z.object({ deskId: z.string().min(1), dates: z.array(z.string()).min(1) }))
    .min(1)
    .max(10)
)

const schema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("reserve"), picks: picksSchema }),
  z.object({ intent: z.literal("cancel"), dates: datesSchema }),
  // A permanent resident giving their desk up on days away, or taking it back.
  z.object({ intent: z.literal("release"), deskId: z.string().min(1), dates: datesSchema }),
  z.object({ intent: z.literal("reclaim"), deskId: z.string().min(1), dates: datesSchema }),
  // Star / unstar a desk.
  z.object({
    intent: z.literal("favorite"),
    deskId: z.string().min(1),
    isFavorite: z.enum(["true", "false"]).transform((v) => v === "true"),
  }),
  // Your usual desk on chosen weekdays (ISO, 1 = Monday), or none.
  z.object({
    intent: z.literal("usual"),
    deskId: z.string().min(1),
    weekdays: z.preprocess(
      (v) => (typeof v === "string" ? JSON.parse(v) : v),
      z.array(z.number().int().min(1).max(7)).min(1).max(7)
    ),
  }),
  z.object({ intent: z.literal("usual-clear") }),
  // Wait for a desk on full days, or stop waiting.
  z.object({ intent: z.literal("waitlist-join"), dates: datesSchema }),
  z.object({ intent: z.literal("waitlist-leave"), dates: datesSchema }),
])

export type ReservationActionData =
  | {
      ok: true
      intent: "reserve"
      booked: string[]
      conflicts: { date: string; userEmail: string }[]
    }
  | { ok: true; intent: "cancel"; cancelled: number }
  | { ok: true; intent: "release"; released: string[] }
  | {
      ok: true
      intent: "reclaim"
      reclaimed: string[]
      taken: { date: string; userEmail: string }[]
    }
  | { ok: true; intent: "favorite" | "usual-clear" | "waitlist-join" | "waitlist-leave" }
  | {
      ok: true
      intent: "usual"
      booked: string[]
      moved: { date: string; deskId: string }[]
      waiting: string[]
    }
  | { ok: false; error: string }

/**
 * Desk bookings for an office: `intent=reserve` (picks: days per desk),
 * `intent=cancel` (dates), and for a permanent resident `intent=release` /
 * `intent=reclaim` (their deskId + dates). Preferences: `favorite` (deskId,
 * isFavorite), `usual` (deskId, weekdays) / `usual-clear`, and
 * `waitlist-join` / `waitlist-leave` (dates). Failures come back as data with a message the UI
 * can show, never as a thrown error (a failing fetcher would take the page down).
 */
export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args)
  const officeSlug = z.string().parse(args.params.officeSlug)
  const core = getCore()
  const base = {
    organizationSlug: profile.organizationSlug,
    officeSlug,
    userEmail: profile.userEmail,
  }

  const translator = await getTranslator(args.request)
  const parsed = schema.safeParse(Object.fromEntries(await args.request.formData()))
  if (!parsed.success)
    return data<ReservationActionData>(
      { ok: false, error: translator.t("Invalid request.") },
      { status: 400 }
    )

  try {
    if (parsed.data.intent === "reserve") {
      const booked: string[] = []
      const conflicts: { date: string; userEmail: string }[] = []
      for (const pick of parsed.data.picks) {
        const result = await core.reservation.reserve({ ...base, ...pick })
        booked.push(...result.booked)
        conflicts.push(...result.conflicts)
      }
      return data<ReservationActionData>({ ok: true, intent: "reserve", booked, conflicts })
    }
    if (parsed.data.intent === "release") {
      const result = await core.reservation.release({
        ...base,
        deskId: parsed.data.deskId,
        dates: parsed.data.dates,
      })
      return data<ReservationActionData>({ ok: true, intent: "release", ...result })
    }
    if (parsed.data.intent === "reclaim") {
      const result = await core.reservation.reclaim({
        ...base,
        deskId: parsed.data.deskId,
        dates: parsed.data.dates,
      })
      return data<ReservationActionData>({ ok: true, intent: "reclaim", ...result })
    }
    if (parsed.data.intent === "favorite") {
      await core.reservation.setFavorite({
        ...base,
        deskId: parsed.data.deskId,
        isFavorite: parsed.data.isFavorite,
      })
      return data<ReservationActionData>({ ok: true, intent: "favorite" })
    }
    if (parsed.data.intent === "usual") {
      const result = await core.reservation.setUsual({
        ...base,
        deskId: parsed.data.deskId,
        weekdays: parsed.data.weekdays,
      })
      return data<ReservationActionData>({ ok: true, intent: "usual", ...result })
    }
    if (parsed.data.intent === "usual-clear") {
      await core.reservation.removeUsual(base)
      return data<ReservationActionData>({ ok: true, intent: "usual-clear" })
    }
    if (parsed.data.intent === "waitlist-join") {
      await core.reservation.joinWaitlist({ ...base, dates: parsed.data.dates })
      return data<ReservationActionData>({ ok: true, intent: "waitlist-join" })
    }
    if (parsed.data.intent === "waitlist-leave") {
      await core.reservation.leaveWaitlist({ ...base, dates: parsed.data.dates })
      return data<ReservationActionData>({ ok: true, intent: "waitlist-leave" })
    }
    const result = await core.reservation.cancel({ ...base, dates: parsed.data.dates })
    return data<ReservationActionData>({ ok: true, intent: "cancel", ...result })
  } catch (error) {
    const fallback = msg("Couldn't update the booking. Try again.")
    if (error instanceof ReservationError)
      return data<ReservationActionData>(
        { ok: false, error: translateError(translator, error, fallback) },
        { status: 400 }
      )
    if (error instanceof ReservationRaceError)
      return data<ReservationActionData>(
        { ok: false, error: translateError(translator, error, fallback) },
        { status: 409 }
      )
    console.error("Reservation failed", error)
    return data<ReservationActionData>(
      { ok: false, error: translator.t(fallback) },
      { status: 500 }
    )
  }
}
