import type { CoreContext } from '../types'
import { reservationMapper } from './mapper'
import type { Reservation } from './types'

export const getManyReservationsByUser =
  ({ mainRepository }: CoreContext) =>
  async (userId: string): Promise<Reservation[]> => {
    const reservations = await mainRepository.reservation.findMany({
      userId,
    })

    return reservations.map(reservationMapper.fromRepository)
  }
