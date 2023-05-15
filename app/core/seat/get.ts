import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

interface Options {
  id: string
  filter?: {
    reservations?: {
      from: Date
      to: Date
    }
  }
}

export const getSeat =
  ({ mainRepository }: CoreContext) =>
  async ({ id, filter }: Options): Promise<Seat | null> => {
    const seat = await mainRepository.seat.find({ id, filter })

    return seat && seatMapper.fromRepository(seat)
  }
