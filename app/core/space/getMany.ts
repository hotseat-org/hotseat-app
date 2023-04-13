import type { CoreContext } from '../types'
import { spaceMapper } from './mapper'
import type { Space } from './types'

export const getManySpaces =
  ({ repository }: CoreContext) =>
  async (): Promise<Space[]> => {
    const spaces = await repository.space.findMany()

    return spaces.map(spaceMapper.fromRepository)
  }
