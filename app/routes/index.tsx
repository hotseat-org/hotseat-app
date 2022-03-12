import { LoaderFunction, useLoaderData } from 'remix'

import { authenticator } from '../services/auth.server.js'

const CONTAINER_STYLES = {
  width: '100%',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  })

  return {
    user,
  }
}

const Dashboard = () => {
  const { user } = useLoaderData()

  return (
    <div style={CONTAINER_STYLES}>
      <h1>You are LoggedIn {user.displayName}</h1>
    </div>
  )
}

export default Dashboard
