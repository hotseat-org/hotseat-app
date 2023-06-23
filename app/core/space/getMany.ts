import type { CoreContext } from '../types'
import { spaceMapper } from './mapper'
import type { Space } from './types'

export const getManySpaces =
  ({ mainRepository }: CoreContext) =>
  async (): Promise<Space[]> => {
    const spaces = await mainRepository.space.findMany()

    return spaces.map(spaceMapper.fromRepository)
  }
