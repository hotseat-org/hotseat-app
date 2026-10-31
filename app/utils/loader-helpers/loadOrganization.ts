import { getCore } from "~/core/get-core"
import { loadOncePerRequest } from "~/utils/loader-helpers/oncePerRequest"

/** The organization as its pages show it, once per request (the office page's loaders both ask). */
export const loadOrganization = (request: Request, slug: string) =>
  loadOncePerRequest(request, `organization:${slug}`, () =>
    getCore().organization.getForPublic({ slug })
  )
