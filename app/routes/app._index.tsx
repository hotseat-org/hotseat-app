import { useState, type FormEvent } from "react"
import { Link, redirect, useLoaderData, useNavigate } from "react-router"
import { ArrowUpRight, Building2 } from "lucide-react"
import { Route } from "./+types/app._index"
import { requireUser } from "~/services/session.server"
import { getCore } from "~/core/get-core"
import { CenteredScreen } from "~/components/ui/CenteredScreen"
import { revalidateOn } from "~/utils/revalidation"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()
  const [firstOrganization] = await core.user.getOrganizations(user.email)

  if (firstOrganization) {
    return redirect(`/app/o/${firstOrganization.slug}`)
  }

  return { firstName: user.displayName?.split(" ")[0] ?? user.email.split("@")[0] }
}

const AppIndex = () => {
  const { firstName } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [code, setCode] = useState("")

  // Accept either a pasted invite link or a bare org slug / slug-hash.
  const join = (e: FormEvent) => {
    e.preventDefault()
    const value = code.trim()
    if (!value) return
    try {
      const url = new URL(value)
      const idx = url.pathname.indexOf("/join/")
      if (idx !== -1) return navigate(url.pathname.slice(idx))
    } catch {
      // not a URL — fall through
    }
    navigate(`/join/${value.replace(/^\/+/, "").replace(/^join\//, "")}`)
  }

  return (
    <CenteredScreen>
      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-brand text-xl font-black text-white">
            H
          </span>
          <span className="text-2xl font-black tracking-tight">Hotseat</span>
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Welcome, {firstName} 👋</h1>
        <p className="mt-1 text-muted">Let&apos;s find you a workspace. Where do you belong?</p>

        <div className="mt-7 grid gap-3.5 text-left sm:grid-cols-2">
          {/* Create */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-surface">
            <div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
              <Building2 className="size-5" />
            </div>
            <h2 className="mt-3 text-base font-extrabold">Create an organization</h2>
            <p className="mt-0.5 text-sm text-muted">
              Start fresh, design your office, and invite your team.
            </p>
            <Link
              to="?modal=new-organization"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-105"
            >
              Create organization
            </Link>
          </div>

          {/* Join */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-surface">
            <div className="grid size-10 place-items-center rounded-xl bg-success/15 text-success">
              <ArrowUpRight className="size-5" />
            </div>
            <h2 className="mt-3 text-base font-extrabold">Join with an invite</h2>
            <p className="mt-0.5 text-sm text-muted">
              Paste an invite link or code from a teammate.
            </p>
            <form onSubmit={join} className="mt-4 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Invite link or code"
                className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus-visible:border-accent"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-accent/15 px-4 py-2.5 text-sm font-bold text-accent transition hover:bg-accent/25"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted">Find your seat. Own your space.</p>
      </div>
    </CenteredScreen>
  )
}

export default AppIndex

// Opening a settings/create modal over this page doesn't change its data.
export const shouldRevalidate = revalidateOn()
