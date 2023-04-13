import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const removeResident =
  ({ repository }: CoreContext) =>
  async (id: string): Promise<Seat> => {
    const seat = await repository.seat.update(id, null)

    return seatMapper.fromRepository(seat)
  }
