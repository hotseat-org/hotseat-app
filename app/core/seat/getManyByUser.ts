import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const getManySeatsByUser =
  ({ mainRepository }: CoreContext) =>
  async (userId: string, spaceId: string): Promise<Seat[]> => {
    const seats = await mainRepository.seat.findMany({
      residentId: userId,
      spaceId,
    })

    return seats.map(seatMapper.fromRepository)
  }
