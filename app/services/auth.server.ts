import { Authenticator } from 'remix-auth'
import { sessionStorage } from '~/services/session.server'
import { GoogleStrategy, SocialsProvider } from 'remix-auth-socials'
import prisma from '~/prisma/client.server'

// Create an instance of the authenticator
// It will take session storage as an input parameter and creates the user session on successful authentication
export const authenticator = new Authenticator(sessionStorage)

// Configuring Google Strategy
authenticator.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: ['email', 'openid', 'profile'],
      callbackURL: `http://localhost:3000/auth/${SocialsProvider.GOOGLE}/callback`,
    },
    async ({ profile }) => {
      return prisma.user.upsert({
        where: { id: profile.id },
        update: {
          displayName: profile.displayName,
          email: profile.emails[0]?.value,
        },
        create: {
          displayName: profile.displayName,
          email: profile.emails[0]?.value,
          id: profile.id,
        },
      })
    }
  )
)
