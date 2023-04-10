import type { CoreContext } from '../types'
import type { Seat } from './types'

export const createSeat =
  ({ repository }: CoreContext) =>
  (id: string, spaceId: string): Promise<Seat> => {
    return repository.createSeat(id, spaceId)
  }
