import type { CoreContext } from "../types"
import type { User } from "../user/types"
import { composeDemoCompany, DEMO_DOMAIN } from "./company"
import { todayIn } from "~/utils/booking"

/** Each visitor's copy of the demo company: its organization and its visitor. */
const SLUG_PREFIX = "fern-and-fox-"
const VISITOR_PREFIX = "visitor-"

/** How long a copy lives before the hourly job clears it. */
const LIFETIME_HOURS = 24

/** Someone looking around a demo copy (they can't create organizations or upload images). */
export const isDemoVisitor = (email: string) =>
  email.startsWith(VISITOR_PREFIX) && email.endsWith(`@${DEMO_DOMAIN}`)

/**
 * A fresh copy of the demo company for one visitor — theirs to click around,
 * book and redraw — and the visitor to sign in as.
 */
export const startDemo =
  ({ mainRepository }: CoreContext) =>
  async (): Promise<User> => {
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    const company = composeDemoCompany({
      today: todayIn("Europe/Prague"),
      organizationSlug: `${SLUG_PREFIX}${id}`,
      visitorEmail: `${VISITOR_PREFIX}${id}@${DEMO_DOMAIN}`,
    })
    const [visitor] = company.people

    await mainRepository.demo.create(company)

    return { email: visitor.email, displayName: visitor.displayName, photo: visitor.avatarUrl }
  }

/** Clear demo copies older than their lifetime (the hourly job). */
export const clearStaleDemos =
  ({ mainRepository }: CoreContext) =>
  () =>
    mainRepository.demo.deleteStale({
      before: new Date(Date.now() - LIFETIME_HOURS * 60 * 60 * 1000),
      slugPrefix: SLUG_PREFIX,
      visitorPrefix: VISITOR_PREFIX,
      domain: DEMO_DOMAIN,
    })
