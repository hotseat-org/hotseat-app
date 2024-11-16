import { Authenticator } from "remix-auth"
import { GitHubStrategy, GitHubStrategyDefaultName } from "remix-auth-github"
import { GoogleStrategy, GoogleStrategyDefaultName } from "remix-auth-google"
import { getCore } from "~/core/get-core"
import type { User } from "~/core/user/types"
import { sessionStorage } from "~/services/session.server"

// Create an instance of the authenticator
// It will take session storage as an input parameter and creates the user session on successful authentication
export const authenticator = new Authenticator<User>(sessionStorage)

// Configuring Google Strategy
authenticator.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: ["email", "openid", "profile"],
      prompt: "select_account",
      callbackURL: `${process.env.BASE_URL}/auth/${GoogleStrategyDefaultName}/callback`,
    },
    async ({ profile }) => {
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
)

authenticator.use(
  new GitHubStrategy(
    {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scopes: ["user:email", "user"],
      redirectURI: `${process.env.BASE_URL}/auth/${GitHubStrategyDefaultName}/callback`,
    },
    async ({ profile }) => {
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
)
