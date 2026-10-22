import type { ReactNode } from "react"
import { useParams } from "react-router"
import {
  AlertTriangle,
  Building,
  Building2,
  Mail,
  PawPrint,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react"
import { SettingsShell, type SettingsLink } from "./SettingsShell"
import { OrgDanger } from "./panels/OrgDanger"
import { OrgGeneral } from "./panels/OrgGeneral"
import { OrgInvitations } from "./panels/OrgInvitations"
import { OrgMembers } from "./panels/OrgMembers"
import { OfficeGeneral, useOfficeData } from "./panels/OfficeGeneral"
import { OfficeDanger } from "./panels/OfficeDanger"
import { UserDanger } from "./panels/UserDanger"
import { UserInvitations } from "./panels/UserInvitations"
import { UserOrganizations } from "./panels/UserOrganizations"
import { UserPet } from "./panels/UserPet"
import { UserProfile } from "./panels/UserProfile"
import { useSettings } from "./useSettings"
import { useUser } from "~/utils/remix"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { ThumbAvatar } from "~/components/office/shell-ui"

const userLinks: SettingsLink[] = [
  { id: "profile", label: "Profile", icon: UserRound, description: "Your name, photo and theme." },
  {
    id: "pet",
    label: "Desk pet",
    icon: PawPrint,
    description: "Who sits at your desk on the days you book it.",
  },
  {
    id: "organizations",
    label: "Organizations",
    icon: Building,
    description: "The organizations you belong to.",
  },
  { id: "invitations", label: "Invitations", icon: Mail, description: "Invites waiting for you." },
  { id: "danger", label: "Danger zone", icon: AlertTriangle, danger: true },
]

const userPanels: Record<string, ReactNode> = {
  profile: <UserProfile />,
  pet: <UserPet />,
  organizations: <UserOrganizations />,
  invitations: <UserInvitations />,
  danger: <UserDanger />,
}

const orgPanels: Record<string, ReactNode> = {
  general: <OrgGeneral />,
  invitations: <OrgInvitations />,
  members: <OrgMembers />,
  danger: <OrgDanger />,
}

const officeLinks: SettingsLink[] = [
  {
    id: "general",
    label: "General",
    icon: SlidersHorizontal,
    description: "Name, cover and a quick look at this office.",
  },
  { id: "danger", label: "Danger zone", icon: AlertTriangle, danger: true },
]

const officePanels: Record<string, ReactNode> = {
  general: <OfficeGeneral />,
  danger: <OfficeDanger />,
}

function UserSettings({ section }: { section: string }) {
  const { selectSection, close } = useSettings()
  const user = useUser()
  const name = user.displayName || user.email.split("@")[0]

  return (
    <SettingsShell
      title="User settings"
      identity={{
        visual: (
          <ThumbAvatar
            src={user.photo}
            fallback={name.slice(0, 1).toUpperCase()}
            className="size-11 rounded-full"
          />
        ),
        name,
        sub: user.email,
      }}
      groupLabel="Account"
      links={userLinks}
      activeSection={section}
      onSelect={selectSection}
      onClose={close}
    >
      {userPanels[section] ?? userPanels.profile}
    </SettingsShell>
  )
}

function OrgSettings({ section }: { section: string }) {
  const { slug } = useParams()
  const { selectSection, close } = useSettings()
  const { organization, organizations, profile } = useOrganizationContext()
  const memberCount = organizations.find((o) => o.slug === organization.slug)?.memberCount

  // Org settings only make sense over an org page (slug in the URL).
  if (!slug) return null

  const links: SettingsLink[] = [
    {
      id: "general",
      label: "General",
      icon: SlidersHorizontal,
      description: "How your organization appears to its members.",
    },
    {
      id: "members",
      label: "Members",
      icon: Users,
      count: memberCount,
      description: "Who's in the organization, and their roles.",
    },
    {
      id: "invitations",
      label: "Invitations",
      icon: Mail,
      description: "Invite people by email or with a link.",
    },
    { id: "danger", label: "Danger zone", icon: AlertTriangle, danger: true },
  ]

  return (
    <SettingsShell
      title="Organization settings"
      identity={{
        visual: (
          <ThumbAvatar
            src={organization.thumbnailUrl}
            fallback={organization.name.slice(0, 1).toUpperCase()}
            className="size-11 rounded-[14px]"
          />
        ),
        name: organization.name,
        sub: `${profile.role === Role.ADMIN ? "Admin" : "Member"}${
          memberCount !== undefined ? ` · ${memberCount} member${memberCount === 1 ? "" : "s"}` : ""
        }`,
      }}
      groupLabel="Organization"
      links={links}
      activeSection={section}
      onSelect={selectSection}
      onClose={close}
    >
      {orgPanels[section] ?? orgPanels.general}
    </SettingsShell>
  )
}

/**
 * Office settings — rendered by its own route
 * (/app/o/:slug/offices/:officeSlug/settings/:section) as a child of the office,
 * so it opens over the office scene.
 */
export function OfficeSettings({ section }: { section: string }) {
  const { officeSlug } = useParams()
  const { selectSection, close } = useSettings()
  const { organization } = useOrganizationContext()
  const office = useOfficeData()?.office

  // Office settings only make sense over an office page.
  if (!officeSlug) return null

  return (
    <SettingsShell
      title="Office settings"
      identity={{
        visual: (
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-accent/15 text-accent">
            <Building2 className="size-[22px]" />
          </span>
        ),
        name: office?.name ?? "Office",
        sub: `${organization.name} · office`,
      }}
      groupLabel="Office"
      links={officeLinks}
      activeSection={section}
      onSelect={selectSection}
      onClose={close}
    >
      {officePanels[section] ?? officePanels.general}
    </SettingsShell>
  )
}

/**
 * User and organization settings, from the `?settings=<scope>/<section>` search
 * param. Mounted high in the tree (app layout) so it overlays whatever page is
 * shown, and closing leaves that page untouched. (Office settings are a route.)
 */
export function SettingsOverlay() {
  const { scope, section } = useSettings()

  if (scope === "user") return <UserSettings section={section ?? "profile"} />
  if (scope === "org") return <OrgSettings section={section ?? "general"} />

  return null
}
