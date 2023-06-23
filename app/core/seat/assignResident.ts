import type { CoreContext } from '../types'
import { seatMapper } from './mapper'
import type { Seat } from './types'

export const assignResident =
  ({ mainRepository, userRepository }: CoreContext) =>
  async (id: string, residentId: string): Promise<Seat> => {
    const resident = userRepository.find({ id: residentId })

    if (!resident) throw new Error('User not found')

    const seat = await mainRepository.seat.update(id, residentId)

    return seatMapper.fromRepository(seat)
  }
