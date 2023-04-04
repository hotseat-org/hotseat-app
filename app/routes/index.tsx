import { LinksFunction, LoaderFunction, redirect } from 'remix'
import Index from './login.js'
import { authenticator } from '../services/auth.server.js'
import headerStyle from '../styles/header.css'
import calendarStyle from '../styles/calendar.css'

export let links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: headerStyle },
    { rel: 'stylesheet', href: calendarStyle }]}

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
