import { GoogleStrategyDefaultName } from "@coji/remix-auth-google"
import { Button } from "@heroui/react"
import { CSSProperties } from "react"
import { Form, useSearchParams } from "react-router"
import HotseatLogo from "~/components/HotseatLogo"

/**
 * The sign-in screen — the /login page, and what the join pages show to
 * someone signed out. (A plain component: a route's default export is wrapped
 * by React Router and ignores props passed to it, so it can't be reused.)
 */
export function LoginScreen({
  redirectTo,
  title = "Welcome to Hotseat",
  subtitle = "Sign in, or create your account, to continue",
}: {
  redirectTo?: string
  /** E.g. "Join Acme" when signing in from an invitation. */
  title?: string
  subtitle?: string
} = {}) {
  const [searchParams] = useSearchParams()
  // Where to land after auth: an explicit prop (e.g. from the invite screen),
  // else a ?redirectTo query, else the auth default ("/").
  const target = redirectTo ?? searchParams.get("redirectTo") ?? undefined

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Ambient warmth — soft office glows in light; a "hint of outrun" cyan
          glow and a faint starfield give the editor's night feel in dark. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-96 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl dark:bg-brand/10" />
        <div className="absolute bottom-0 left-1/2 h-64 w-150 -translate-x-1/2 rounded-full bg-warning/15 blur-3xl dark:bg-accent/10" />
        <div className="absolute inset-0 hidden motion-safe:dark:block">
          {Array.from({ length: 12 }, (_, i) => {
            const seed = i * 8 + 3
            const top = ((seed * 13) % 27) + 2
            const left = ((seed * 17) % 88) + 5
            const duration = 3 + (i % 4) * 0.8
            const delay = ((seed * 11) % 30) / 10
            return (
              <div
                key={i}
                className="absolute size-0.5 rounded-full bg-foreground animate-[twinkle_var(--duration,3s)_ease-in-out_var(--delay,0s)_infinite]"
                style={
                  {
                    top: `${top}%`,
                    left: `${left}%`,
                    "--duration": `${duration}s`,
                    "--delay": `${delay}s`,
                  } as CSSProperties
                }
              />
            )
          })}
        </div>
      </div>

      <div className="relative z-10 mb-10">
        <HotseatLogo size={240} />
      </div>

      <div className="relative z-10 flex min-w-80 flex-col items-center gap-6 rounded-2xl border border-border bg-surface/80 px-10 py-8 shadow-overlay backdrop-blur-xl dark:bg-surface/60">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-xl font-bold tracking-widest text-foreground">{title}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Form method="get" action={`/auth/${GoogleStrategyDefaultName}`} className="w-full">
            {target && <input type="hidden" name="redirectTo" value={target} />}
            <Button
              variant="tertiary"
              type="submit"
              className="w-full justify-center border border-border bg-surface transition-colors hover:border-accent"
            >
              <span className="iconify-color devicon--google" />
              Continue with Google
            </Button>
          </Form>
          <Form method="get" action="/auth/github" className="w-full">
            {target && <input type="hidden" name="redirectTo" value={target} />}
            <Button
              variant="tertiary"
              type="submit"
              className="w-full justify-center border border-border bg-surface transition-colors hover:border-accent"
            >
              <span className="iconify devicon--github text-foreground" />
              Continue with GitHub
            </Button>
          </Form>
        </div>
      </div>

      <p className="relative z-10 mt-8 text-xs text-muted">Find your seat. Own your space.</p>
    </div>
  )
}
