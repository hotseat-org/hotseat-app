import type { CoreContext } from '../types'
import { spaceMapper } from './mapper'
import type { Space } from './types'

interface CreateSpaceOptions {
  name: string
  spaceId: string
  description?: string
}

export const createNewSpace =
  ({ repository }: CoreContext) =>
  async (options: CreateSpaceOptions): Promise<Space> => {
    const space = await repository.space.create(options)

    return spaceMapper.fromRepository(space)
  }
