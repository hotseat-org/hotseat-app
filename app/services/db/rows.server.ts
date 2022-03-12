import { Seat as PrismaSeat } from '@prisma/client'
import { exclude } from '~/utils/exclude'
import prisma from '../prisma.server'

type Seat = Omit<PrismaSeat, 'PK' | 'row' | 'ownerPK'>

interface Props {
  from: Date
  to: Date
}

export const getRows = async ({ from, to }: Props) => {
  const seats = await prisma.seat.findMany({
    include: { owner: true, reservations: { where: { from, to } } },
  })

  const rows = seats.reduce((acc, seat) => {
    const key = seat.row
    const current = acc[key] ?? []

    return {
      ...acc,
      [key]: [...current, exclude(seat, 'PK', 'row', 'ownerPK')],
    }
  }, {} as Record<number, Seat[]>)

  return rows
}
