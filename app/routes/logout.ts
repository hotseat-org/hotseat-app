import { authenticator } from '../services/auth.server.js'
import type { ActionFunction, LoaderFunction } from '@remix-run/node'

export const action: ActionFunction = ({ request }) => {
  return authenticator.logout(request, {
    redirectTo: '/login',
  })
}

export const loader: LoaderFunction = ({ request }) => {
  return authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  })
}
