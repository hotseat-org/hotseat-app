import { useRouteLoaderData } from "react-router"
import type { loader as rootLoader } from "~/root"

/** The hosted service, or one company's own installation (see edition.server.ts). */
export type Edition = "saas" | "self-hosted"

/** This server's edition, as the root loader tells the page. */
export const useEdition = (): Edition =>
  useRouteLoaderData<typeof rootLoader>("root")?.edition ?? "saas"

/** One company's own installation: one organization, no creating more. */
export const useIsSelfHosted = () => useEdition() === "self-hosted"
