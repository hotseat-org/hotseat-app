import { SocialsProvider } from 'remix-auth-socials'
import { Form } from 'remix'

export default function Index() {
  return (
    <Form
      method="post"
      action={`/auth/${SocialsProvider.GOOGLE}`}
      className="w-full flex justify-center items-center h-screen"
    >
      <button className="transition ease-in px-4 py-4 bg-red-500 hover:bg-red-600 rounded font-bold">
        Login with Google
      </button>
    </Form>
  )
}
