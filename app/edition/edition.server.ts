import type { Edition } from "./edition"

/**
 * Which Hotseat this server is (HOTSEAT_EDITION): the hosted service
 * ("saas", the default), or one company's own installation ("self-hosted") —
 * one organization, set up by its admin, no product page or demo.
 */
export const EDITION: Edition =
  process.env.HOTSEAT_EDITION === "self-hosted" ? "self-hosted" : "saas"

export const isSelfHosted = EDITION === "self-hosted"

/** Turn away a request for something only the hosted service has (404, as if it weren't there). */
export const requireSaas = () => {
  if (isSelfHosted) throw new Response(null, { status: 404 })
}
