import { Button } from '@material-tailwind/react'
import { Form } from '@remix-run/react'
import { SocialsProvider } from 'remix-auth-socials'

export default function Index() {
  return (
    <Form
      method="post"
      action={`/auth/${SocialsProvider.GOOGLE}`}
      className="w-full flex justify-center items-center h-screen"
    >
      <Button type="submit">Login with Google</Button>
    </Form>
  )
}
