import type { CoreContext } from '../types'
import { spaceMapper } from './mapper'
import type { Space } from './types'

export const getSpace =
  ({ repository }: CoreContext) =>
  async (id: string): Promise<Space> => {
    const space = await repository.space.find(id)

    if (!space) {
      throw new Error('Space not found')
    }

    return spaceMapper.fromRepository(space)
  }
