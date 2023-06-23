import { Authenticator } from 'remix-auth'
import { sessionStorage } from '~/services/session.server'
import { GoogleStrategy, SocialsProvider } from 'remix-auth-socials'
import type { User } from '~/core/user/types'
import { getCore } from '~/core/get-core'

// Create an instance of the authenticator
// It will take session storage as an input parameter and creates the user session on successful authentication
export const authenticator = new Authenticator<User>(sessionStorage)

// Configuring Google Strategy
authenticator.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: ['email', 'openid', 'profile'],
      prompt: 'select_account',
      callbackURL: `${process.env.BASE_URL}/auth/${SocialsProvider.GOOGLE}/callback`,
    },
    async ({ profile }) => {
      const core = getCore()

      const primaryEmail = profile.emails[0]

      if (!primaryEmail) throw new Error('User is missing email')

      const user = await core.user.get(primaryEmail.value)

      if (!user) throw new Error('User does not exists in organization')
      return user
    }
  )
)
