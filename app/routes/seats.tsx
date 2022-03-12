import {
  Form,
  LinksFunction,
  LoaderFunction,
  Outlet,
  useLoaderData,
} from 'remix'
import Header from '~/components/Header/index.js'
import { authenticator } from '../services/auth.server.js'
import headerStyle from '../styles/header.css'

export let links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: headerStyle }]
}
export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  })

  return {
    user,
  }
}

const Index = () => {
  const { user } = useLoaderData()

  return (
    <>
      <div className="w-full flex p-4 bg-red-500 items-center justify-end gap-8">
        <Header />
        <h1>{user.displayName}</h1>
        <Form method="post" action={`/logout`}>
          <button className="p-2 bg-slate-500 hover:bg-slate-600 rounded transition">
            Logout
          </button>
        </Form>
      </div>

      <Outlet />
    </>
  )
}

export default Index
