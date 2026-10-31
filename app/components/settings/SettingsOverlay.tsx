import type { ReactNode } from "react"
import { useParams } from "react-router"
import {
  AlertTriangle,
  Building,
  Building2,
  Mail,
  Palette,
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
import { OrgOffices } from "./panels/OrgOffices"
import { OfficeGeneral, useOfficeData } from "./panels/OfficeGeneral"
import { OfficeDanger } from "./panels/OfficeDanger"
import { UserDanger } from "./panels/UserDanger"
import { UserInvitations } from "./panels/UserInvitations"
import { UserOrganizations } from "./panels/UserOrganizations"
import { UserPet } from "./panels/UserPet"
import { UserProfile } from "./panels/UserProfile"
import { UserAppearance } from "./panels/UserAppearance"
import { useSettings } from "./useSettings"
import { useUser } from "~/utils/remix"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

const userLinks: SettingsLink[] = [
  {
    id: "profile",
    label: msg("Profile"),
    icon: UserRound,
    description: msg("Your name and photo."),
  },
  {
    id: "appearance",
    label: msg("Appearance"),
    icon: Palette,
    description: msg("Language, light or dark, and your colour scheme."),
  },
  {
    id: "pet",
    label: msg("Desk pet"),
    icon: PawPrint,
    description: msg("Who sits at your desk on the days you book it."),
  },
  {
    id: "organizations",
    label: msg("Organizations"),
    icon: Building,
    description: msg("The organizations you belong to."),
  },
  {
    id: "invitations",
    label: msg("Invitations"),
    icon: Mail,
    description: msg("Invites waiting for you."),
  },
  { id: "danger", label: msg("Danger zone"), icon: AlertTriangle, danger: true },
]

const userPanels: Record<string, ReactNode> = {
  profile: <UserProfile />,
  appearance: <UserAppearance />,
  pet: <UserPet />,
  organizations: <UserOrganizations />,
  invitations: <UserInvitations />,
  danger: <UserDanger />,
}

const orgPanels: Record<string, ReactNode> = {
  general: <OrgGeneral />,
  invitations: <OrgInvitations />,
  members: <OrgMembers />,
  offices: <OrgOffices />,
  danger: <OrgDanger />,
}

const officeLinks: SettingsLink[] = [
  {
    id: "general",
    label: msg("General"),
    icon: SlidersHorizontal,
    description: msg("Name, cover and a quick look at this office."),
  },
  { id: "danger", label: msg("Danger zone"), icon: AlertTriangle, danger: true },
]

const officePanels: Record<string, ReactNode> = {
  general: <OfficeGeneral />,
  danger: <OfficeDanger />,
}

function UserSettings({ section }: { section?: string }) {
  const { selectSection, close } = useSettings()
  const user = useUser()
  const { t } = useI18n()
  const name = user.displayName || user.email.split("@")[0]

  return (
    <SettingsShell
      title={t("User settings")}
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
      groupLabel={t("Account")}
      links={userLinks}
      activeSection={section}
      onSelect={selectSection}
      onClose={close}
    >
      {(section && userPanels[section]) || userPanels.profile}
    </SettingsShell>
  )
}

function OrgSettings({ section }: { section?: string }) {
  const { slug } = useParams()
  const { selectSection, close } = useSettings()
  const { organization, organizations, profile } = useOrganizationContext()
  const memberCount = organizations.find((o) => o.slug === organization.slug)?.memberCount
  const { t, tn } = useI18n()

  // Org settings only make sense over an org page (slug in the URL), and are an
  // admin's: a member following a ?settings=org/… link gets nothing (the server
  // rejects their changes anyway).
  if (!slug || profile.role !== Role.ADMIN) return null

  const links: SettingsLink[] = [
    {
      id: "general",
      label: msg("General"),
      icon: SlidersHorizontal,
      description: msg("How your organization appears to its members."),
    },
    {
      id: "members",
      label: msg("Members"),
      icon: Users,
      count: memberCount,
      description: msg("Who's in the organization, and their roles."),
    },
    {
      id: "invitations",
      label: msg("Invitations"),
      icon: Mail,
      description: msg("Invite people by email or with a link."),
    },
    {
      id: "offices",
      label: msg("Offices"),
      icon: Building2,
      description: msg("The organization's offices. Deleting one removes its layout and bookings."),
    },
    { id: "danger", label: msg("Danger zone"), icon: AlertTriangle, danger: true },
  ]

  return (
    <SettingsShell
      title={t("Organization settings")}
      identity={{
        visual: (
          <ThumbAvatar
            src={organization.thumbnailUrl}
            fallback={organization.name.slice(0, 1).toUpperCase()}
            className="size-11 rounded-[14px]"
          />
        ),
        name: organization.name,
        sub: `${profile.role === Role.ADMIN ? t("Admin") : t("Member")}${
          memberCount !== undefined ? ` · ${tn(memberCount, "{n} member", "{n} members")}` : ""
        }`,
      }}
      groupLabel={t("Organization")}
      links={links}
      activeSection={section}
      onSelect={selectSection}
      onClose={close}
    >
      {(section && orgPanels[section]) || orgPanels.general}
    </SettingsShell>
  )
}

/**
 * Office settings — rendered by its own route
 * (/app/o/:slug/offices/:officeSlug/settings/:section) as a child of the office,
 * so it opens over the office scene.
 */
export function OfficeSettings({ section }: { section?: string }) {
  const { officeSlug } = useParams()
  const { selectSection, close } = useSettings()
  const { organization } = useOrganizationContext()
  const office = useOfficeData()?.office
  const { t } = useI18n()

  // Office settings only make sense over an office page.
  if (!officeSlug) return null

  return (
    <SettingsShell
      title={t("Office settings")}
      identity={{
        visual: (
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-accent/15 text-accent">
            <Building2 className="size-[22px]" />
          </span>
        ),
        name: office?.name ?? t("Office"),
        sub: `${organization.name} · ${t("office")}`,
      }}
      groupLabel={t("Office")}
      links={officeLinks}
      activeSection={section}
      onSelect={selectSection}
      onClose={close}
    >
      {(section && officePanels[section]) || officePanels.general}
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

  if (scope === "user") return <UserSettings section={section} />
  if (scope === "org") return <OrgSettings section={section} />

  return null
}
