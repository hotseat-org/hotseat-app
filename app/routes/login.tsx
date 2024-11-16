import { Button, Card, CardBody } from "@nextui-org/react"
import { Form } from "@remix-run/react"
import type { LoaderFunctionArgs } from "@vercel/remix"
import { redirect } from "@vercel/remix"
import { GitHubStrategyDefaultName } from "remix-auth-github"
import { GoogleStrategyDefaultName } from "remix-auth-google"
import { authenticator } from "~/services/auth.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request)

  if (user) return redirect("/")

  return null
}

export default function Login() {
  return (
    <div className="w-full flex justify-center items-center h-screen relative overflow-hidden">
      <div className="w-full h-full filter absolute gradient" />
      <Card className="z-10">
        <CardBody className="flex-col gap-2">
          <Form method="post" action={`/auth/${GoogleStrategyDefaultName}`}>
            <Button variant="flat" color="primary" type="submit">
              Login with Google
            </Button>
          </Form>
          <Form method="post" action={`/auth/${GitHubStrategyDefaultName}`}>
            <Button variant="flat" color="primary" type="submit">
              Login with Github
            </Button>
          </Form>
        </CardBody>
      </Card>
    </div>
  )
}
