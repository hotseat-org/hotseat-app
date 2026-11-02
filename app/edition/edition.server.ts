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

/** Who may set a self-hosted installation up (HOTSEAT_ADMIN_EMAIL, comma-separated). */
const SETUP_ADMINS = (process.env.HOTSEAT_ADMIN_EMAIL ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

/** Whether someone may set the installation up: one of its named admins, or (none named) anyone, first come. */
export const maySetUp = (email: string) =>
  SETUP_ADMINS.length === 0 || SETUP_ADMINS.includes(email.toLowerCase())

/** The admins named to set it up (for "ask … to set it up"). */
export const getSetupAdmins = () => SETUP_ADMINS

/** Turn away a request for something only a self-hosted installation has (404). */
export const requireSelfHosted = () => {
  if (!isSelfHosted) throw new Response(null, { status: 404 })
}
