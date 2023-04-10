import type { CoreContext } from '../types'
import type { Space } from './types'

export const getSpace =
  ({ repository }: CoreContext) =>
  (id: string): Promise<Space> => {
    return repository.getSpace(id)
  }
