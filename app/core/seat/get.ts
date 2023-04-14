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
  ({ repository }: CoreContext) =>
  async ({ id, filter }: Options): Promise<Seat | null> => {
    const seat = await repository.seat.find({ id, filter })

    return seat && seatMapper.fromRepository(seat)
  }
