import type { CoreContext } from '../types'
import { spaceMapper } from './mapper'
import type { Space } from './types'

interface Options {
  id: string
  filter?: {
    reservations?: {
      from: Date
      to: Date
    }
  }
}

export const getSpace =
  ({ mainRepository }: CoreContext) =>
  async ({ id, filter }: Options): Promise<Space> => {
    const space = await mainRepository.space.find({ id, filter })

    if (!space) {
      throw new Error('Space not found')
    }

    return spaceMapper.fromRepository(space)
  }
