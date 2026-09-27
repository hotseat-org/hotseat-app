import { Authenticator } from "remix-auth"
import { GitHubStrategy } from "remix-auth-github"
import { GoogleStrategy, GoogleStrategyDefaultName } from "@coji/remix-auth-google"
import { getCore } from "~/core/get-core"
import type { User } from "~/core/user/types"

export const authenticator = new Authenticator<User>()

const googleStrategy = new GoogleStrategy(
  {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    scopes: ["email", "openid", "profile"],
    prompt: "select_account",
    redirectURI: `${process.env.BASE_URL}/auth/${GoogleStrategyDefaultName}/callback`,
  },
  async ({ tokens }) => {
    const profile = await GoogleStrategy.userProfile(tokens)

    const core = getCore()

    const primaryEmail = profile.emails[0]

    if (!primaryEmail) throw new Error("User is missing email")

    const user = await core.user.get(primaryEmail.value)

    if (!user) {
      return await core.user.create({
        email: primaryEmail.value,
        displayName: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
      })
    }

    return user
  }
)

authenticator.use(googleStrategy)

authenticator.use(
  new GitHubStrategy(
    {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scopes: ["user:email", "user"],
      redirectURI: `${process.env.BASE_URL}/auth/github/callback`,
    },
    async ({ tokens }) => {
      const core = getCore()

      const githubUser = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokens.accessToken()}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }).then((res) => res.json())

      const primaryEmail = githubUser.email

      if (!primaryEmail) throw new Error("User is missing email")

      const user = await core.user.get(primaryEmail)

      if (!user) {
        return await core.user.create({
          email: primaryEmail,
          displayName: githubUser.name,
          avatarUrl: githubUser.avatar_url,
        })
      }

      return user
    }
  )
)
