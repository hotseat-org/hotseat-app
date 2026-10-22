import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { ReservationError, ReservationRaceError } from "~/core/reservation/types"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const datesSchema = z.preprocess(
  (v) => (typeof v === "string" ? JSON.parse(v) : v),
  z.array(z.string()).min(1)
)

const schema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("reserve"), deskId: z.string().min(1), dates: datesSchema }),
  z.object({ intent: z.literal("cancel"), dates: datesSchema }),
  // A permanent resident giving their desk up on days away, or taking it back.
  z.object({ intent: z.literal("release"), deskId: z.string().min(1), dates: datesSchema }),
  z.object({ intent: z.literal("reclaim"), deskId: z.string().min(1), dates: datesSchema }),
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
  | { ok: false; error: string }

/**
 * Desk bookings for an office: `intent=reserve` (deskId + dates),
 * `intent=cancel` (dates), and for a permanent resident `intent=release` /
 * `intent=reclaim` (their deskId + dates). Failures come back as data with a message the UI
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

  const parsed = schema.safeParse(Object.fromEntries(await args.request.formData()))
  if (!parsed.success)
    return data<ReservationActionData>({ ok: false, error: "Invalid request." }, { status: 400 })

  try {
    if (parsed.data.intent === "reserve") {
      const result = await core.reservation.reserve({
        ...base,
        deskId: parsed.data.deskId,
        dates: parsed.data.dates,
      })
      return data<ReservationActionData>({ ok: true, intent: "reserve", ...result })
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
    const result = await core.reservation.cancel({ ...base, dates: parsed.data.dates })
    return data<ReservationActionData>({ ok: true, intent: "cancel", ...result })
  } catch (error) {
    if (error instanceof ReservationError)
      return data<ReservationActionData>({ ok: false, error: error.message }, { status: 400 })
    if (error instanceof ReservationRaceError)
      return data<ReservationActionData>({ ok: false, error: error.message }, { status: 409 })
    console.error("Reservation failed", error)
    return data<ReservationActionData>(
      { ok: false, error: "Couldn't update the booking. Try again." },
      { status: 500 }
    )
  }
}
