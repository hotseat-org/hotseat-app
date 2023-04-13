import { createNewSpace } from './space/create'
import { getSpace } from './space/get'
import { getManySpaces } from './space/getMany'
import type { CoreContext } from './types'
import { getSeatByFurniture } from './seat/getByFurniture'
import { createSeat } from './seat/create'
import { getManySeatsBySpace } from './seat/getManyBySpace'
import { deleteSeat } from './seat/delete'
import { getUser } from './user/get'
import { createUser } from './user/create'
import { getManyUsers } from './user/getMany'
import { assignResident } from './seat/assignResident'
import { removeResident } from './seat/removeResident'

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
    delete: deleteSeat(context),
    assignResident: assignResident(context),
    removeResident: removeResident(context),
  },
  user: {
    get: getUser(context),
    create: createUser(context),
    getMany: getManyUsers(context),
  },
})

export type Core = ReturnType<typeof createCore>
