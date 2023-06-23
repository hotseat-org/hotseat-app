import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const removeResident =
  ({ mainRepository }: CoreContext) =>
  async (id: string): Promise<Seat> => {
    const seat = await mainRepository.seat.update(id, null)

    return seatMapper.fromRepository(seat)
  }
