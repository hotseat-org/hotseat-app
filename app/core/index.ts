import { createNewSpace } from './space/create'
import { getManySpaces } from './space/getMany'
import type { CoreContext } from './types'

export const createCore = (context: CoreContext) => ({
  space: {
    create: createNewSpace(context),
    getMany: getManySpaces(context),
  },
})

export type Core = ReturnType<typeof createCore>
