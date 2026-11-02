import { data, type ActionFunctionArgs } from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { TeamError } from "~/core/team"
import { translateError } from "~/i18n/errors"
import { getTranslator } from "~/i18n/locale.server"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { MAX_TEAM_NAME, TEAM_COLOR_NAMES } from "~/utils/teams"

const teamSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().max(MAX_TEAM_NAME * 2),
  color: z.enum(TEAM_COLOR_NAMES),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7),
  members: z.array(z.string().max(254)).max(5000),
  zones: z
    .array(
      z.object({
        officeSlug: z.string().min(1).max(200),
        zone: z.string().min(1).max(200),
        keepDays: z.number().int().nullable(),
      })
    )
    .max(200),
})

export type TeamActionData =
  | { ok: true; intent: "save" | "delete"; id?: string }
  | { ok: false; error: string }

/** Organization settings → Teams (admins only): save a team, or delete one. */
export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args, { requiredRole: Role.ADMIN })
  const form = await args.request.formData()
  const who = { organizationSlug: profile.organizationSlug, userEmail: profile.userEmail }
  const core = getCore()

  if (form.get("intent") === "delete") {
    await core.team.delete({ ...who, id: z.string().parse(form.get("id")) })

    return data<TeamActionData>({ ok: true, intent: "delete" })
  }

  const team = teamSchema.parse(JSON.parse(z.string().parse(form.get("team"))))
  try {
    const id = await core.team.save({ ...who, team })

    return data<TeamActionData>({ ok: true, intent: "save", id })
  } catch (error) {
    if (!(error instanceof TeamError)) throw error

    return data<TeamActionData>(
      {
        ok: false,
        error: translateError(await getTranslator(args.request), error, "Something went wrong"),
      },
      { status: 400 }
    )
  }
}
