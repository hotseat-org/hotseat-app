import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const getSeatByFurniture =
  ({ mainRepository }: CoreContext) =>
  async (id: string): Promise<Seat | null> => {
    const seat = await mainRepository.seat.findByFurniture(id)

    return seat && seatMapper.fromRepository(seat)
  }
