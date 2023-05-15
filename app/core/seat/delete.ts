import type { CoreContext } from '../types'

export const deleteSeat =
  ({ mainRepository }: CoreContext) =>
  (id: string): Promise<void> => {
    return mainRepository.seat.delete(id)
  }
