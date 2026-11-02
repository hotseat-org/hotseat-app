/** A way to sign in the server offers (see auth.server.ts), as the sign-in screen shows it. */
export interface SignInProvider {
  /** Its path: /auth/{id}. */
  id: string
  kind: "google" | "github" | "oidc"
  /** OIDC: whose it is, for its button ("Continue with Microsoft"); none: "single sign-on". */
  name?: string | null
}
