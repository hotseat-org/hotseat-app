import type { CoreContext } from '../types'
import type { Space } from './types'

interface CreateSpaceOptions {
  name: string
  spaceId: string
  description?: string
}

export const createNewSpace =
  ({ repository }: CoreContext) =>
  (options: CreateSpaceOptions): Promise<Space> => {
    return repository.createSpace(options)
  }
