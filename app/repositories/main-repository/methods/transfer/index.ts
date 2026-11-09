import prisma from "~/services/prisma.server"
import { Prisma } from "~/repositories/main-repository/prisma/generated/prisma-client/client"
import type {
  DeskRelease,
  FavoriteDesk,
  Notification,
  Office,
  OfficeClosedDay,
  OfficeSlugRedirect,
  Organization,
  OrganizationInvite,
  OrganizationSlugRedirect,
  Profile,
  Reservation,
  RoomKit,
  SeatRules,
  Team,
  TeamMember,
  TeamZone,
  User,
  UsualDesk,
  WaitlistEntry,
} from "~/repositories/main-repository/prisma/generated/prisma-client/client"

/** Everything an organization holds, row by row, as the database has it. */
export interface OrganizationRows {
  organization: Organization
  /** Its members' accounts. */
  users: User[]
  profiles: Profile[]
  invites: OrganizationInvite[]
  offices: Office[]
  closedDays: OfficeClosedDay[]
  reservations: Reservation[]
  deskReleases: DeskRelease[]
  favoriteDesks: FavoriteDesk[]
  usualDesks: UsualDesk[]
  seatRules: SeatRules[]
  waitlist: WaitlistEntry[]
  roomKits: RoomKit[]
  teams: Team[]
  teamMembers: TeamMember[]
  teamZones: TeamZone[]
  /** Its members' notifications about it. */
  notifications: Notification[]
  organizationRedirects: OrganizationSlugRedirect[]
  officeRedirects: OfficeSlugRedirect[]
}

/** Rows after a trip through JSON: dates as ISO strings (which the database takes back as they are). */
export type JsonRows<Rows> = {
  [Key in keyof Rows]: Rows[Key] extends (infer Row)[]
    ? JsonRow<Row>[]
    : Rows[Key] extends object
      ? JsonRow<Rows[Key]>
      : Rows[Key]
}

type JsonRow<Row> = {
  [Field in keyof Row]: Row[Field] extends Date
    ? string
    : Row[Field] extends Date | null
      ? string | null
      : Row[Field]
}

/** An organization's rows, to export. Null when there's no such organization. */
export const findOrganizationRows = async (slug: string): Promise<OrganizationRows | null> => {
  const organization = await prisma.organization.findUnique({ where: { slug } })
  if (!organization) return null

  const scope = { where: { organizationSlug: slug } }
  const [
    users,
    profiles,
    invites,
    offices,
    closedDays,
    reservations,
    deskReleases,
    favoriteDesks,
    usualDesks,
    seatRules,
    waitlist,
    roomKits,
    teams,
    teamMembers,
    teamZones,
    notifications,
    organizationRedirects,
    officeRedirects,
  ] = await Promise.all([
    prisma.user.findMany({ where: { profiles: { some: { organizationSlug: slug } } } }),
    prisma.profile.findMany(scope),
    prisma.organizationInvite.findMany(scope),
    prisma.office.findMany(scope),
    prisma.officeClosedDay.findMany(scope),
    prisma.reservation.findMany(scope),
    prisma.deskRelease.findMany(scope),
    prisma.favoriteDesk.findMany(scope),
    prisma.usualDesk.findMany(scope),
    prisma.seatRules.findMany(scope),
    prisma.waitlistEntry.findMany(scope),
    prisma.roomKit.findMany(scope),
    prisma.team.findMany(scope),
    prisma.teamMember.findMany(scope),
    prisma.teamZone.findMany(scope),
    prisma.notification.findMany({
      where: { organizationSlug: slug, user: { profiles: { some: { organizationSlug: slug } } } },
    }),
    prisma.organizationSlugRedirect.findMany({ where: { slug } }),
    prisma.officeSlugRedirect.findMany(scope),
  ])

  return {
    organization,
    users,
    profiles,
    invites,
    offices,
    closedDays,
    reservations,
    deskReleases,
    favoriteDesks,
    usualDesks,
    seatRules,
    waitlist,
    roomKits,
    teams,
    teamMembers,
    teamZones,
    notifications,
    organizationRedirects,
    officeRedirects,
  }
}

/** A JSON field: a database NULL for none (a bare null isn't one). */
const toJsonField = (value: Prisma.JsonValue) =>
  value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)

/** Long enough for years of bookings. */
const INSERT_TIMEOUT_MS = 5 * 60 * 1000

/**
 * An exported organization, written whole, or not at all. Accounts already
 * here (whoever is importing it) are kept as they are.
 */
export const insertOrganizationRows = (rows: JsonRows<OrganizationRows>) =>
  prisma.$transaction(
    async (transaction) => {
      await transaction.user.createMany({ data: rows.users, skipDuplicates: true })
      await transaction.organization.create({ data: rows.organization })
      await transaction.office.createMany({
        data: rows.offices.map((office) => ({ ...office, layout: toJsonField(office.layout) })),
      })
      await transaction.profile.createMany({ data: rows.profiles })
      await transaction.organizationInvite.createMany({ data: rows.invites })
      await transaction.officeClosedDay.createMany({ data: rows.closedDays })
      await transaction.reservation.createMany({ data: rows.reservations })
      await transaction.deskRelease.createMany({ data: rows.deskReleases })
      await transaction.favoriteDesk.createMany({ data: rows.favoriteDesks })
      await transaction.usualDesk.createMany({ data: rows.usualDesks })
      await transaction.seatRules.createMany({
        data: rows.seatRules.map((rules) => ({
          ...rules,
          rules: rules.rules as Prisma.InputJsonValue,
        })),
      })
      await transaction.waitlistEntry.createMany({ data: rows.waitlist })
      await transaction.roomKit.createMany({
        data: rows.roomKits.map((kit) => ({
          ...kit,
          objects: kit.objects as Prisma.InputJsonValue,
        })),
      })
      await transaction.team.createMany({ data: rows.teams })
      await transaction.teamMember.createMany({ data: rows.teamMembers })
      await transaction.teamZone.createMany({ data: rows.teamZones })
      await transaction.notification.createMany({ data: rows.notifications })
      await transaction.organizationSlugRedirect.createMany({ data: rows.organizationRedirects })
      await transaction.officeSlugRedirect.createMany({ data: rows.officeRedirects })
    },
    { timeout: INSERT_TIMEOUT_MS, maxWait: INSERT_TIMEOUT_MS }
  )
