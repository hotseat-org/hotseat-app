import type { LoaderFunctionArgs, MetaFunction } from "react-router"
import { redirect } from "react-router"
import { ProductPage } from "~/components/product/ProductPage"
import { getCore } from "~/core/get-core"
import { metaTranslator } from "~/i18n/translate"
import { isAuthenticated } from "~/services/session.server"

export const meta: MetaFunction = ({ matches }) => {
  const { t } = metaTranslator(matches)
  const title = t("Hotseat — book a desk on a map of your office")
  const description = t(
    "Put your office on a map. Book desks by the day, sit near your people and see who's in."
  )

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await isAuthenticated(request)
  if (!user) return null

  // Straight to their office — one redirect, not a chain through every layout.
  return redirect(await getCore().user.landing(user.email))
}

// Signed in, the loader redirects; everyone else gets the product page.
export default ProductPage
