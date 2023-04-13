import type { CoreContext } from '../types'

interface Params {
  userId: string
  id: string
}

export const cancelReservation =
  ({ repository }: CoreContext) =>
  async ({ userId }: Params): Promise<void> => {
    const reservation = await repository.reservation.find({ userId })

    if (!reservation)
      throw new Error('You can cancel only your own reservation')

    await repository.reservation.delete(reservation.id)
  }
