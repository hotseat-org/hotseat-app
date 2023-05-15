import type { CoreContext } from '../types'
import { spaceMapper } from './mapper'
import type { Space } from './types'

interface CreateSpaceOptions {
  name: string
  spaceId: string
  description?: string
}

export const createNewSpace =
  ({ mainRepository }: CoreContext) =>
  async (options: CreateSpaceOptions): Promise<Space> => {
    const space = await mainRepository.space.create(options)

    return spaceMapper.fromRepository(space)
  }
