import { createNewSpace } from './space/create'
import { getSpace } from './space/get'
import { getManySpaces } from './space/getMany'
import type { CoreContext } from './types'
import { getSeatByFurniture } from './seat/getByFurniture'
import { createSeat } from './seat/create'
import { getManySeatsBySpace } from './seat/getManyBySpace'

export const createCore = (context: CoreContext) => ({
  space: {
    create: createNewSpace(context),
    getMany: getManySpaces(context),
    get: getSpace(context),
  },
  seat: {
    getByFurniture: getSeatByFurniture(context),
    create: createSeat(context),
    getManySpaces: getManySeatsBySpace(context),
  },
})

export type Core = ReturnType<typeof createCore>
