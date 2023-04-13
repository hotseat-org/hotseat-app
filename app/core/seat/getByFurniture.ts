import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const getSeatByFurniture =
  ({ repository }: CoreContext) =>
  async (id: string): Promise<Seat | null> => {
    const seat = await repository.seat.find(id)

    return seat && seatMapper.fromRepository(seat)
  }
