import {
  redirect,
  useLocation,
  useLoaderData,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router"
import { getCore } from "~/core/get-core"
import { isAuthenticated, requireUser } from "~/services/session.server"
import { JoinCard, JoinProblem } from "~/components/JoinScreen"
import { LoginScreen } from "~/components/LoginScreen"
import { useI18n } from "~/i18n/I18nProvider"
import { metaTranslator } from "~/i18n/translate"

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  const { t } = metaTranslator(matches)
  const title = t("Join {name}", { name: loaderData?.org?.name ?? loaderData?.slug ?? "" })
  return [
    { title },
    { property: "og:title", content: title },
    { property: "og:description", content: t("You've been invited to a Hotseat workspace.") },
    {
      property: "og:image",
      content: `${loaderData?.baseUrl}${import.meta.env.BASE_URL}images/og/join-organization/${loaderData?.slug}`,
    },
  ]
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { slug, hash } = params
  if (!slug || !hash) throw redirect("/")

  const user = await isAuthenticated(request)
  const core = getCore()
  const org = await core.organization.getForPublic({ slug })
  // A universal link from before a rename.
  const renamed = org ? null : await core.organization.renamedTo(slug)
  if (renamed) throw redirect(`/join/${renamed}/${hash}`)
  const baseUrl = new URL(request.url).origin

  return {
    slug,
    baseUrl,
    authed: Boolean(user),
    org: org && {
      name: org.name,
      slug: org.slug,
      description: org.description ?? undefined,
      thumbnailUrl: org.thumbnailUrl,
    },
  }
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await requireUser(request)
  const { slug, hash } = params
  if (!slug || !hash) throw redirect("/")

  const form = await request.formData()
  if (form.get("intent") === "decline") throw redirect("/app")

  try {
    const profile = await getCore().organization.joinWithHash({ email: user.email, hash })
    throw redirect(`/app/o/${profile.organizationSlug}`)
  } catch (error) {
    if (error instanceof Response) throw error // the redirect above
    throw redirect(`/join/${slug}/${hash}?error=invalid`)
  }
}

export default function JoinInvite() {
  const { org, authed } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { t } = useI18n()

  // Not signed in yet — show the auth screen, returning here after login.
  if (!authed)
    return (
      <LoginScreen
        redirectTo={location.pathname}
        title={org ? t("Join {name}", { name: org.name }) : undefined}
        subtitle={org ? t("Sign in to accept the invitation") : undefined}
      />
    )

  if (!org || searchParams.get("error") === "invalid")
    return (
      <JoinProblem title={t("Invite not valid")}>
        {t("This invite link is invalid or has expired. Ask a teammate for a fresh one.")}
      </JoinProblem>
    )

  return <JoinCard organization={org} />
}
