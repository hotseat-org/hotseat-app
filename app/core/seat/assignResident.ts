import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const assignResident =
  ({ repository }: CoreContext) =>
  async (id: string, residentId: string): Promise<Seat> => {
    const resident = repository.user.find(residentId)

    if (!resident) throw new Error('User not found')

    const seat = await repository.seat.update(id, residentId)

    return seatMapper.fromRepository(seat)
  }
