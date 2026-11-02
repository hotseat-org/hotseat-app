import type { LoaderFunctionArgs, MetaFunction } from "react-router"
import { redirect } from "react-router"
import { ProductPage } from "~/components/product/ProductPage"
import { getCore } from "~/core/get-core"
import { metaTranslator } from "~/i18n/translate"
import { isAuthenticated } from "~/services/session.server"

export const meta: MetaFunction = ({ matches }) => {
  const { t } = metaTranslator(matches)
  const title = t("Hotseat — desk booking on a map of your office")
  const description = t(
    "Draw your office in 3D and let your team book desks by the day, find a seat near colleagues, and see who's in."
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
