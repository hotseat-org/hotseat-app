import type { CoreContext } from '../types'
import type { Space } from './types'

export const getManySpaces =
  ({ repository }: CoreContext) =>
  (): Promise<Space[]> => {
    return repository.getSpaces()
  }
