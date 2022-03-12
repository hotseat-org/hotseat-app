import { Seat as PrismaSeat } from '@prisma/client'
import { exclude } from '~/utils/exclude'
import prisma from '../prisma.server'

type Seat = Omit<PrismaSeat, 'PK' | 'row' | 'ownerPK'>

export const getRows = async () => {
  const seats = await prisma.seat.findMany({
    include: { owner: true, reservations: true },
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
