import { confirmOrganizationInvite } from './organization/confirmInvite'
import { createOrganization } from './organization/create'
import { deleteOrganization } from './organization/delete'
import { deleteOrganizationInvite } from './organization/deleteInvite'
import { getOrganizationForUser } from './organization/getForUser'
import { getOrganizationInvites } from './organization/getInvites'
import { organizationInviteMember } from './organization/inviteMember'
import { organizationIsAvailable } from './organization/isAvailable'
import { joinOrganizationWithHash } from './organization/joinWithHash'
import { updateOrganization } from './organization/update'
import { cancelReservation } from './reservation/cancel'
import { createReservation } from './reservation/create'
import { getManyReservationsByUser } from './reservation/getManyByUser'
import { assignResident } from './seat/assignResident'
import { createSeat } from './seat/create'
import { deleteSeat } from './seat/delete'
import { getSeat } from './seat/get'
import { getSeatByFurniture } from './seat/getByFurniture'
import { getManySeatsBySpace } from './seat/getManyBySpace'
import { getManySeatsByUser } from './seat/getManyByUser'
import { removeResident } from './seat/removeResident'
import { createNewSpace } from './space/create'
import { getSpace } from './space/get'
import { getManySpaces } from './space/getMany'
import type { CoreContext } from './types'
import { createUser } from './user/create'
import { getUser } from './user/get'
import { getUserOrganizations } from './user/getOrganizations'
import { userIsMember } from './user/isMember'

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
    getOrganizations: getUserOrganizations(context),
    isMember: userIsMember(context),
  },
  reservation: {
    create: createReservation(context),
    cancel: cancelReservation(context),
    getManyByUser: getManyReservationsByUser(context),
  },
  organization: {
    isAvailable: organizationIsAvailable(context),
    getForUser: getOrganizationForUser(context),
    create: createOrganization(context),
    update: updateOrganization(context),
    delete: deleteOrganization(context),
    inviteMember: organizationInviteMember(context),
    getInvites: getOrganizationInvites(context),
    deleteInvite: deleteOrganizationInvite(context),
    confirmInvite: confirmOrganizationInvite(context),
    joinWithHash: joinOrganizationWithHash(context),
  },
})

export type Core = ReturnType<typeof createCore>
