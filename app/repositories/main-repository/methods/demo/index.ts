import type { DemoCompany } from "~/core/demo/company"
import prisma from "~/services/prisma.server"
import { Prisma } from "~/repositories/main-repository/prisma/generated/prisma-client/client"
import { toUtcDate } from "~/utils/booking"

/** A demo company, written whole (its people are shared by every copy, so kept if there). */
export const createDemoCompany = async (company: DemoCompany) => {
  const { organization, office, people } = company
  const scope = { organizationSlug: organization.slug, officeSlug: office.slug }

  await prisma.user.createMany({
    data: people.map(({ email, displayName, avatarUrl }) => ({ email, displayName, avatarUrl })),
    skipDuplicates: true,
  })
  await prisma.organization.create({
    data: {
      ...organization,
      offices: {
        create: {
          slug: office.slug,
          name: office.name,
          timezone: office.timezone,
          layout: office.layout as unknown as Prisma.InputJsonValue,
        },
      },
    },
  })
  await prisma.profile.createMany({
    data: people.map(({ email, role }) => ({
      userEmail: email,
      organizationSlug: organization.slug,
      role,
      favoriteOfficeSlug: office.slug,
    })),
  })
  await prisma.reservation.createMany({
    data: company.reservations.map(({ date, ...reservation }) => ({
      ...scope,
      ...reservation,
      createdByEmail: reservation.userEmail,
      date: toUtcDate(date),
    })),
  })
  await prisma.deskRelease.createMany({
    data: company.releases.map(({ date, ...release }) => ({
      ...scope,
      ...release,
      date: toUtcDate(date),
    })),
  })
  await prisma.seatRules.create({
    data: {
      ...scope,
      userEmail: company.seatRules.userEmail,
      rules: company.seatRules.rules as Prisma.InputJsonValue,
    },
  })
  await prisma.favoriteDesk.create({ data: { ...scope, ...company.favorite } })
  await prisma.team.createMany({
    data: company.teams.map(({ id, name, color, weekdays }) => ({
      id,
      organizationSlug: organization.slug,
      name,
      color,
      weekdays,
    })),
  })
  await prisma.teamMember.createMany({
    data: company.teams.flatMap((team) =>
      team.members.map((userEmail) => ({
        teamId: team.id,
        organizationSlug: organization.slug,
        userEmail,
      }))
    ),
  })
  await prisma.teamZone.createMany({
    data: company.teams.flatMap(({ id, zone, keepDays }) =>
      zone ? [{ teamId: id, ...scope, zone, keepDays }] : []
    ),
  })
}

/**
 * Demo copies made before `before`: their organizations (`slugPrefix`…) and
 * their visitors (`visitorPrefix`…@`domain`) — everything else goes with them.
 */
export const deleteStaleDemoCompanies = async ({
  before,
  slugPrefix,
  visitorPrefix,
  domain,
}: {
  before: Date
  slugPrefix: string
  visitorPrefix: string
  domain: string
}) => {
  const organizations = await prisma.organization.deleteMany({
    where: { slug: { startsWith: slugPrefix }, createdAt: { lt: before } },
  })
  const visitors = await prisma.user.deleteMany({
    where: {
      email: { startsWith: visitorPrefix, endsWith: `@${domain}` },
      createdAt: { lt: before },
    },
  })

  return { organizations: organizations.count, visitors: visitors.count }
}
