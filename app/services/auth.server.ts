import { Authenticator } from "remix-auth"
import { GitHubStrategy } from "remix-auth-github"
import { OAuth2Strategy } from "remix-auth-oauth2"
import { GoogleStrategy, GoogleStrategyDefaultName } from "@coji/remix-auth-google"
import type { SignInProvider } from "./signIn"
import { getCore } from "~/core/get-core"
import type { User } from "~/core/user/types"

export const authenticator = new Authenticator<User>()

const env = process.env

/** A signed-in person's account: found by their email, or made on their first sign-in. */
const findOrCreateUser = async (profile: {
  email: string
  displayName: string
  avatarUrl?: string
}) => {
  const core = getCore()
  const user = await core.user.get(profile.email)

  return user ?? (await core.user.create(profile))
}

/**
 * The ways to sign in this server offers: each one whose keys are set —
 * Google and GitHub (the hosted service's), and any OpenID Connect provider
 * (Microsoft Entra, Google Workspace, Okta, Keycloak…: OIDC_ISSUER,
 * OIDC_CLIENT_ID, OIDC_CLIENT_SECRET; OIDC_NAME names its button).
 */
export const SIGN_IN_PROVIDERS: SignInProvider[] = [
  ...(env.GOOGLE_CLIENT_ID ? [{ id: GoogleStrategyDefaultName, kind: "google" as const }] : []),
  ...(env.GITHUB_CLIENT_ID ? [{ id: "github", kind: "github" as const }] : []),
  ...(env.OIDC_ISSUER && env.OIDC_CLIENT_ID
    ? [{ id: "oidc", kind: "oidc" as const, name: env.OIDC_NAME || null }]
    : []),
]

if (env.GOOGLE_CLIENT_ID)
  authenticator.use(
    new GoogleStrategy(
      {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        scopes: ["email", "openid", "profile"],
        prompt: "select_account",
        redirectURI: `${env.BASE_URL}/auth/${GoogleStrategyDefaultName}/callback`,
      },
      async ({ tokens }) => {
        const profile = await GoogleStrategy.userProfile(tokens)
        const [primaryEmail] = profile.emails
        if (!primaryEmail) throw new Error("User is missing email")

        return findOrCreateUser({
          email: primaryEmail.value,
          displayName: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        })
      }
    )
  )

if (env.GITHUB_CLIENT_ID)
  authenticator.use(
    new GitHubStrategy(
      {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET as string,
        scopes: ["user:email", "user"],
        redirectURI: `${env.BASE_URL}/auth/github/callback`,
      },
      async ({ tokens }) => {
        const githubUser = await fetch("https://api.github.com/user", {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${tokens.accessToken()}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }).then((response) => response.json())
        if (!githubUser.email) throw new Error("User is missing email")

        return findOrCreateUser({
          email: githubUser.email,
          displayName: githubUser.name ?? githubUser.login,
          avatarUrl: githubUser.avatar_url,
        })
      }
    )
  )

/** What an OpenID Connect provider says about itself (the parts used here). */
interface OidcConfiguration {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

/** The OIDC person: their email (else an email-shaped username), name and photo. */
const getOidcProfile = (claims: Record<string, unknown>) => {
  const username = typeof claims.preferred_username === "string" ? claims.preferred_username : ""
  const email = typeof claims.email === "string" ? claims.email : username.includes("@") && username
  if (!email) throw new Error("The identity provider gave no email")
  if (claims.email_verified === false) throw new Error("The email isn't verified")

  return {
    email,
    displayName: typeof claims.name === "string" ? claims.name : email,
    avatarUrl: typeof claims.picture === "string" ? claims.picture : undefined,
  }
}

/** Ask the OIDC provider for its endpoints, and start using it. */
const registerOidc = async () => {
  const issuer = (env.OIDC_ISSUER ?? "").replace(/\/+$/, "")
  const response = await fetch(`${issuer}/.well-known/openid-configuration`)
  if (!response.ok) throw new Error(`OIDC discovery failed at ${issuer} (${response.status})`)

  const configuration = (await response.json()) as OidcConfiguration

  authenticator.use(
    new OAuth2Strategy(
      {
        cookie: "oidc",
        clientId: env.OIDC_CLIENT_ID as string,
        clientSecret: env.OIDC_CLIENT_SECRET ?? null,
        authorizationEndpoint: configuration.authorization_endpoint,
        tokenEndpoint: configuration.token_endpoint,
        redirectURI: `${env.BASE_URL}/auth/oidc/callback`,
        scopes: ["openid", "email", "profile"],
      },
      async ({ tokens }) => {
        const claims = await fetch(configuration.userinfo_endpoint, {
          headers: { Authorization: `Bearer ${tokens.accessToken()}` },
        }).then((userinfo) => userinfo.json())

        return findOrCreateUser(getOidcProfile(claims))
      }
    ),
    "oidc"
  )
}

// Discovered once, on first use (and tried again if it failed).
let oidcRegistration: Promise<void> | null = null

/**
 * Get a provider ready to sign in with: whether it's one this server offers.
 * OIDC learns its provider's endpoints the first time.
 */
export const prepareSignIn = async (id: string) => {
  if (!SIGN_IN_PROVIDERS.some((provider) => provider.id === id)) return false
  if (id !== "oidc") return true

  oidcRegistration ??= registerOidc().catch((error) => {
    oidcRegistration = null
    throw error
  })
  await oidcRegistration

  return true
}
