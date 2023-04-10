import type { CoreContext } from '../types'
import type { Seat } from './types'

export const getManySeatsBySpace =
  ({ repository }: CoreContext) =>
  (spaceId: string): Promise<Seat[]> => {
    return repository.getSeats(spaceId)
  }
