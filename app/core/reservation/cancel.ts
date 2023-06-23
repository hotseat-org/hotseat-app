import type { CoreContext } from '../types'

interface Params {
  userId: string
  id: string
}

export const cancelReservation =
  ({ mainRepository }: CoreContext) =>
  async ({ userId }: Params): Promise<void> => {
    const reservation = await mainRepository.reservation.find({ userId })

    if (!reservation)
      throw new Error('You can cancel only your own reservation')

    await mainRepository.reservation.delete(reservation.id)
  }
