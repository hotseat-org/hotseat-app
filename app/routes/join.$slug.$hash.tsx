import {
  Form,
  Link,
  redirect,
  useLocation,
  useLoaderData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router"
import { Building2 } from "lucide-react"
import Login from "./login"
import { getCore } from "~/core/get-core"
import { isAuthenticated, requireUser } from "~/services/session.server"
import { CenteredScreen } from "~/components/ui/CenteredScreen"

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `Join ${loaderData?.org?.name ?? loaderData?.slug}` },
  { property: "og:title", content: `Join ${loaderData?.org?.name ?? loaderData?.slug}` },
  { property: "og:description", content: "You've been invited to a Hotseat workspace." },
  {
    property: "og:image",
    content: `${loaderData?.baseUrl}/images/og/join-organization/${loaderData?.slug}`,
  },
]

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { slug, hash } = params
  if (!slug || !hash) throw redirect("/")

  const user = await isAuthenticated(request)
  const org = await getCore().organization.getForPublic({ slug })
  const baseUrl = new URL(request.url).origin

  return {
    slug,
    baseUrl,
    authed: Boolean(user),
    org: org && {
      name: org.name,
      slug: org.slug,
      description: org.description,
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

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

export default function JoinInvite() {
  const { org, authed } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const location = useLocation()

  // Not signed in yet — show the auth screen, returning here after login.
  if (!authed) return <Login redirectTo={location.pathname} />

  const showError = searchParams.get("error") === "invalid"
  const joining = navigation.state !== "idle" && navigation.formData?.get("intent") === "accept"

  return (
    <CenteredScreen>
      {!org || showError ? (
        <div className="relative z-10 max-w-sm text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">Invite not valid</h1>
          <p className="mt-2 text-muted">
            This invite link is invalid or has expired. Ask a teammate for a fresh one.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex rounded-xl bg-accent/15 px-4 py-2.5 text-sm font-bold text-accent hover:bg-accent/25"
          >
            Back to Hotseat
          </Link>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-overlay">
          {org.thumbnailUrl ? (
            <img
              src={org.thumbnailUrl}
              alt=""
              className="mx-auto size-14 rounded-2xl object-cover"
            />
          ) : (
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-brand text-xl font-black text-white">
              {initials(org.name) || <Building2 className="size-6" />}
            </div>
          )}
          <p className="mt-4 text-sm text-muted">You&apos;ve been invited to join</p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">{org.name}</h1>
          {org.description && <p className="mt-1 text-sm text-muted">{org.description}</p>}

          <div className="mt-6 flex gap-2.5">
            <Form method="post" className="flex-1">
              <input type="hidden" name="intent" value="decline" />
              <button
                type="submit"
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-foreground/5"
              >
                Decline
              </button>
            </Form>
            <Form method="post" className="flex-1">
              <input type="hidden" name="intent" value="accept" />
              <button
                type="submit"
                disabled={joining}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105 disabled:opacity-60"
              >
                {joining ? "Joining…" : "Accept invite"}
              </button>
            </Form>
          </div>
        </div>
      )}
    </CenteredScreen>
  )
}
