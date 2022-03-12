import { LinksFunction, LoaderFunction, redirect } from 'remix'

import { authenticator } from '../services/auth.server.js'
import headerStyle from '../styles/header.css'
import Index from './login.js'

export let links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: headerStyle }]
}
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
