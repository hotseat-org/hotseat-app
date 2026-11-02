import type { LoaderFunctionArgs, MetaFunction } from "react-router"
import { redirect } from "react-router"
import { NIGHT } from "~/components/NightScene"
import { ProductPage } from "~/components/product/ProductPage"
import { getCore } from "~/core/get-core"
import { isSelfHosted } from "~/edition/edition.server"
import { metaTranslator } from "~/i18n/translate"
import { isAuthenticated } from "~/services/session.server"
import type { PageColor } from "~/utils/pageColor"

// The whole page is at night, as signing in is: the browser's bars too.
export const handle = { pageColor: { background: NIGHT, isDark: true } satisfies PageColor }

export const meta: MetaFunction<typeof loader> = ({ loaderData, matches }) => {
  const { t } = metaTranslator(matches)
  const title = t("Hotseat — book a desk on a map of your office")
  const description = t(
    "Put your office on a map. Book desks by the day, sit near your people and see who's in."
  )
  // Link previews (Slack, Teams…) need the picture's full address.
  const picture = `${loaderData?.origin ?? ""}${import.meta.env.BASE_URL}images/product/share.jpg`

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: picture },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
  ]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await isAuthenticated(request)
  // One company's own installation has no product page: straight to signing in.
  if (!user && isSelfHosted) return redirect("/login")
  if (!user) return { origin: new URL(request.url).origin }

  // Straight to their office — one redirect, not a chain through every layout.
  return redirect(await getCore().user.landing(user.email))
}

// Signed in, the loader redirects; everyone else gets the product page.
export default ProductPage
