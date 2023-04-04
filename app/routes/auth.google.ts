import { authenticator } from '../services/auth.server.js'
import { SocialsProvider } from 'remix-auth-socials'
import type { ActionFunction } from '@remix-run/node'

export const action: ActionFunction = ({ request }) => {
  return authenticator.authenticate(SocialsProvider.GOOGLE, request, {
    successRedirect: '/',
    failureRedirect: '/login',
  })
}
