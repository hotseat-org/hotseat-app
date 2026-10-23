import { LoaderFunctionArgs, redirect, useLoaderData } from "react-router"
import { Building2 } from "lucide-react"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { ButtonLink } from "~/components/ButtonLink"
import { WorkspaceSwitcher } from "~/components/office/WorkspaceSwitcher"
import { AccountMenu } from "~/components/office/AccountMenu"
import { TopBar } from "~/components/office/MobileShell"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { OfficeFloor } from "~/components/office/OfficeFloor"
import { EmptyState } from "~/components/ui/EmptyState"
import { revalidateOn } from "~/utils/revalidation"

export const loader = async (args: LoaderFunctionArgs) => {
  const core = getCore()
  const profile = await requireProfile(args)

  const offices = await core.organization.getOffices({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })

  if (offices.totalCount > 0) {
    // Keep the page's query (e.g. ?modal=new-office) across the redirect — but
    // not React Router's own `_routes`, which a client navigation's data
    // request carries in `request.url`.
    const search = new URL(args.request.url).searchParams
    search.delete("_routes")
    const query = search.toString()
    return redirect(
      `/app/o/${profile.organizationSlug}/offices/${offices.data[0].slug}${query ? `?${query}` : ""}`
    )
  }

  return { canCreate: profile.role === Role.ADMIN, slug: profile.organizationSlug }
}

const Offices = () => {
  const { canCreate } = useLoaderData<typeof loader>()
  const isMobile = useIsMobile()

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-background text-foreground">
      {/* Empty office floor with animated shine */}
      <OfficeFloor />

      {/* Chrome — same as the office view, minus the scene: the phone's top bar,
          or the floating switcher and account on larger screens. */}
      {isMobile ? (
        <TopBar offices={[]} />
      ) : (
        <>
          <WorkspaceSwitcher offices={[]} />
          <div className="absolute right-5 top-5">
            <AccountMenu />
          </div>
        </>
      )}

      {/* Empty state (pointer-events-none so it never covers the corner chrome) */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
        <EmptyState
          className="pointer-events-auto"
          icon={Building2}
          title="No offices yet"
          description={
            canCreate
              ? "Design your first office in the 3D editor — draw walls, drop desks and seats, then invite the team to find their spot."
              : "This organization doesn’t have any offices yet. Ask an admin to create the first one."
          }
        >
          {canCreate && (
            <ButtonLink to="?modal=new-office" variant="primary">
              <Building2 className="size-4" />
              <span>Create office</span>
            </ButtonLink>
          )}
        </EmptyState>
      </div>
    </div>
  )
}

export default Offices

// Opening a settings/create modal over this page doesn't change its data.
export const shouldRevalidate = revalidateOn({ params: ["slug"] })
