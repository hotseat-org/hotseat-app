import type { CoreContext } from '../types'

export const deleteSeat =
  ({ repository }: CoreContext) =>
  (id: string): Promise<void> => {
    return repository.seat.delete(id)
  }
