import { createNewSpace } from './space/create'
import { getSpace } from './space/get'
import { getManySpaces } from './space/getMany'
import type { CoreContext } from './types'
import { getSeatByFurniture } from './seat/getByFurniture'
import { createSeat } from './seat/create'
import { getManySeatsBySpace } from './seat/getManyBySpace'
import { getManySeatsByUser } from './seat/getManyByUser'
import { deleteSeat } from './seat/delete'
import { getUser } from './user/get'
import { assignResident } from './seat/assignResident'
import { removeResident } from './seat/removeResident'
import { getSeat } from './seat/get'
import { createReservation } from './reservation/create'
import { cancelReservation } from './reservation/cancel'
import { getManyReservationsByUser } from './reservation/getManyByUser'
import { createUser } from './user/create'

export const createCore = (context: CoreContext) => ({
  space: {
    create: createNewSpace(context),
    getMany: getManySpaces(context),
    get: getSpace(context),
  },
  seat: {
    get: getSeat(context),
    getByFurniture: getSeatByFurniture(context),
    getManyByUser: getManySeatsByUser(context),
    create: createSeat(context),
    getManySpaces: getManySeatsBySpace(context),
    delete: deleteSeat(context),
    assignResident: assignResident(context),
    removeResident: removeResident(context),
  },
  user: {
    get: getUser(context),
    create: createUser(context),
  },
  reservation: {
    create: createReservation(context),
    cancel: cancelReservation(context),
    getManyByUser: getManyReservationsByUser(context),
  },
})

export type Core = ReturnType<typeof createCore>
