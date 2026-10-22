import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { LoginScreen } from "~/components/LoginScreen"
import { isAuthenticated } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (await isAuthenticated(request)) return redirect("/")
}

export default function Login() {
  return <LoginScreen />
}
