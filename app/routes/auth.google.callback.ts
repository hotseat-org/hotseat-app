import { authenticator } from '../services/auth.server'
import { SocialsProvider } from 'remix-auth-socials'
import { LoaderFunction } from 'remix'

export const loader: LoaderFunction = ({ request }) => {
  return authenticator.authenticate(SocialsProvider.GOOGLE, request, {
    successRedirect: '/office',
    failureRedirect: '/login',
  })
}
