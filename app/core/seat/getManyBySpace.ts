import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const getManySeatsBySpace =
  ({ repository }: CoreContext) =>
  async (spaceId: string): Promise<Seat[]> => {
    const seats = await repository.seat.findMany(spaceId)

    return seats.map(seatMapper.fromRepository)
  }
