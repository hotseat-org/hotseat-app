import { authenticator } from '../services/auth.server.js'
import { SocialsProvider } from 'remix-auth-socials'
import { ActionFunction } from 'remix'

export const action: ActionFunction = ({ request }) => {
  return authenticator.authenticate(SocialsProvider.GOOGLE, request, {
    successRedirect: '/',
    failureRedirect: '/login',
  })
}
