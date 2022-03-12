import { Form, LoaderFunction, useLoaderData } from 'remix'

import { authenticator } from '../services/auth.server.js'

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

  console.log(user)

  return (
    <div className="w-full flex p-4 bg-red-500 items-center justify-end gap-8">
      <h1>{user.displayName}</h1>
      <Form method="post" action={`/logout`}>
        <button className="p-2 bg-slate-500 hover:bg-slate-600 rounded transition">
          Logout
        </button>
      </Form>
    </div>
  )
}

export default Dashboard
