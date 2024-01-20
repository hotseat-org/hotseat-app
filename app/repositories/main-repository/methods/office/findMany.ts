import prisma from '~/services/prisma.server'

export interface FindOfficesArgs {
  filter: {
    organizationSlug: string
  }
  pagination?: {
    take: number
    skip: number
  }
}

export const findOffices = async ({ filter, pagination }: FindOfficesArgs) => {
  const [totalCount, offices] = await Promise.all([
    prisma.office.count({ where: filter }),
    prisma.office.findMany({
      where: filter,
      take: pagination?.take,
      skip: pagination?.skip,
    }),
  ])

  return {
    take: pagination?.take ?? 0,
    skip: pagination?.skip ?? 0,
    totalCount,
    data: offices,
  }
}
