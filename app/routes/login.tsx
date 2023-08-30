import { Button } from '@nextui-org/react'
import type { LoaderArgs } from '@vercel/remix'
import { redirect } from '@vercel/remix'
import { Form } from '@remix-run/react'
import { SocialsProvider } from 'remix-auth-socials'
import { authenticator } from '~/services/auth.server'

export const loader = async ({ request }: LoaderArgs) => {
  const user = await authenticator.isAuthenticated(request)

  if (user) return redirect('/')

  return null
}

export default function Login() {
  return (
    <div className="w-full flex justify-center items-center h-screen flex-col gap-2">
      <Form method="post" action={`/auth/${SocialsProvider.GOOGLE}`}>
        <Button type="submit">Login with Google</Button>
      </Form>
      <Form method="post" action={`/auth/${SocialsProvider.GITHUB}`}>
        <Button type="submit">Login with Github</Button>
      </Form>
    </div>
  )
}
