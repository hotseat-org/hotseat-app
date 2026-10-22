import { redirect } from "react-router"

/**
 * After a rename moved a slug: the page the form was sent from (its
 * `returnTo` field), under the new URL. Redirecting from the action — rather
 * than navigating after it — means the old URL is never revalidated (it's a
 * 404 by then).
 */
export const redirectToRenamed = (
  formData: FormData,
  segment: string,
  from: string,
  to: string
) => {
  const returnTo = String(formData.get("returnTo") ?? "")
  // Only paths within the app (never another origin).
  const page = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/app"
  return redirect(page.replace(`${segment}${from}`, `${segment}${to}`))
}

/**
 * A request for a renamed organization/office (`from`, now `to`): the same
 * page under the current URL. Works for document and data (`.data`)
 * requests alike — the redirect target is always the page's own path.
 */
export const redirectToRenamedPage = (
  request: Request,
  segment: string,
  from: string,
  to: string
) => {
  const url = new URL(request.url)
  const base = import.meta.env.BASE_URL.replace(/\/$/, "")
  const path = url.pathname.replace(base, "").replace(/\.data$/, "")
  url.searchParams.delete("_routes") // data-request plumbing, not part of the page
  const search = url.searchParams.size ? `?${url.searchParams}` : ""
  return redirect(path.replace(`${segment}${from}`, `${segment}${to}`) + search)
}
