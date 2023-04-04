import Index from './login.js'
import { authenticator } from '../services/auth.server.js'

import { LoaderFunction, redirect } from '@remix-run/node'

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  })

  if (user) return redirect('/seats')

  return {
    user,
  }
}

export default Index
