import type { CoreContext } from '../types'
import type { Seat } from './types'

export const getSeatByFurniture =
  ({ repository }: CoreContext) =>
  (id: string): Promise<Seat | null> => {
    return repository.getSeat(id)
  }
