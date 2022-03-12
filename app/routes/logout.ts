import { authenticator } from '../services/auth.server.js'
import { ActionFunction, LoaderFunction } from 'remix'

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
