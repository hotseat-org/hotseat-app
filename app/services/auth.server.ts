import { Authenticator } from 'remix-auth'
import { sessionStorage } from '~/services/session.server'
import { GoogleStrategy, SocialsProvider } from 'remix-auth-socials'
import prisma from '~/services/prisma.server'

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
      prompt: 'select_account',
      callbackURL: `http://localhost:3000/auth/${SocialsProvider.GOOGLE}/callback`,
    },
    async ({ profile }) => {
      const user = await prisma.user.findUnique({
        where: { id: profile.id },
        include: { photos: true, reservations: true, seatsResident: true },
      })

      console.log(user)

      if (user) {
        return user
      }

      return prisma.user.create({
        data: {
          displayName: profile.displayName,
          email: profile.emails[0]?.value,
          id: profile.id,
          photos: {
            createMany: {
              data: profile.photos.map(({ value }) => ({ url: value })),
            },
          },
        },
        include: { photos: true, seatsResident: true, reservations: true },
      })
    }
  )
)
