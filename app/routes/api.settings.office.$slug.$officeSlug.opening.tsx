import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { MAX_CLOSED_DAYS, OfficeOpeningError } from "~/core/office/opening"
import { translateError } from "~/i18n/errors"
import { getTranslator } from "~/i18n/locale.server"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { addDays, daysBetween, isDay } from "~/utils/booking"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

const day = z.string().refine(isDay)

const schema = z.discriminatedUnion("intent", [
  // The weekdays it's open (ISO), as "1,2,3,4,5".
  z.object({
    intent: z.literal("set-weekdays"),
    weekdays: z
      .string()
      .transform((list) => list.split(",").filter(Boolean).map(Number))
      .pipe(z.array(z.number().int().min(1).max(7)).max(7)),
  }),
  // Closed from one day to another (inclusive), with a reason.
  z.object({
    intent: z.literal("close-days"),
    from: day,
    to: day,
    reason: z.string().max(80).optional(),
  }),
  z.object({ intent: z.literal("reopen-day"), date: day }),
])

/** Office settings → Opening (admins only): weekdays open, and closed days. */
export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const fields = schema.parse(Object.fromEntries(await args.request.formData()))
  const who = {
    organizationSlug: profile.organizationSlug,
    officeSlug: z.string().parse(args.params.officeSlug),
    userEmail: profile.userEmail,
  }
  const core = getCore()

  try {
    if (fields.intent === "set-weekdays") {
      const { cancelled } = await core.office.setWeekdays({ ...who, weekdays: fields.weekdays })

      return data({ ok: true as const, intent: fields.intent, cancelled })
    }

    if (fields.intent === "close-days") {
      const [from, to] = [fields.from, fields.to].sort()
      // A year at most (checked before listing the days: a range to 9999 would be millions).
      if (to > addDays(from, MAX_CLOSED_DAYS - 1))
        throw new OfficeOpeningError("Pick between 1 and 366 days.")
      const dates = daysBetween(from, to)
      const { cancelled } = await core.office.closeDays({ ...who, dates, reason: fields.reason })

      return data({ ok: true as const, intent: fields.intent, cancelled })
    }

    await core.office.reopenDays({ ...who, dates: [fields.date] })

    return data({ ok: true as const, intent: fields.intent, cancelled: 0 })
  } catch (error) {
    if (!(error instanceof OfficeOpeningError)) throw error

    return data(
      {
        ok: false as const,
        intent: fields.intent,
        error: translateError(await getTranslator(args.request), error, "Something went wrong"),
      },
      { status: 400 }
    )
  }
}
