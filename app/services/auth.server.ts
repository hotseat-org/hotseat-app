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

      const user = await core.user.get(profile.id)

      if (user) return user

      if (!profile.emails[0]) throw new Error('User is missing email')

      return core.user.create({
        displayName: profile.displayName,
        id: profile.id,
        email: profile.emails[0].value,
        photos: profile.photos.map((photo) => photo.value),
      })
    }
  )
)
