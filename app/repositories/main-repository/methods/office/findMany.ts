import prisma from '~/services/prisma.server'
import { Office, PaginatedResult } from '../../types'

export interface FindOfficesArgs {
  filter: {
    organizationSlug: string
  }
  pagination?: {
    take: number
    skip: number
  }
}

export const findOffices = async ({
  filter,
  pagination,
}: FindOfficesArgs): Promise<PaginatedResult<Office>> => {
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
    data: offices.map((office) => ({
      ...office,
      description: office.description ?? undefined,
      thumbnail: office.thumbnail ?? undefined,
    })),
  }
}
