import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const createSeat =
  ({ mainRepository }: CoreContext) =>
  async (id: string, spaceId: string): Promise<Seat> => {
    const seat = await mainRepository.seat.create(id, spaceId)

    return seatMapper.fromRepository(seat)
  }
