import { createOffice } from './office/create'
import { officeIsAvailable } from './office/isAvailable'
import { setOfficeFavorite } from './office/setFavorite'
import { unsetOfficeFavorite } from './office/unsetFavorite'
import { confirmOrganizationInvite } from './organization/confirmInvite'
import { createOrganization } from './organization/create'
import { deleteOrganization } from './organization/delete'
import { deleteOrganizationInvite } from './organization/deleteInvite'
import { generateNewOrganizationInviteLink } from './organization/generateNewInviteLink'
import { getOrganizationForPublic } from './organization/getForPublic'
import { getOrganizationForUser } from './organization/getForUser'
import { getOrganizationInvites } from './organization/getInvites'
import { getOrganizationMembers } from './organization/getMembers'
import { getOrganizationOffices } from './organization/getOffices'
import { organizationInviteMember } from './organization/inviteMember'
import { organizationIsAvailable } from './organization/isAvailable'
import { joinOrganizationWithHash } from './organization/joinWithHash'
import { leaveOrganization } from './organization/leave'
import { setOrganizationMemberRole } from './organization/setMemberRole'
import { updateOrganization } from './organization/update'
import { getProfile } from './profile/get'
import type { CoreContext } from './types'
import { createUser } from './user/create'
import { getUser } from './user/get'
import { getUserOrganizationInvites } from './user/getOrganizationInvites'
import { getUserOrganizations } from './user/getOrganizations'
import { userIsMember } from './user/isMember'
import { updateUser } from './user/update'

export const createCore = (context: CoreContext) => ({
  user: {
    get: getUser(context),
    create: createUser(context),
    getOrganizations: getUserOrganizations(context),
    getOrganizationInvites: getUserOrganizationInvites(context),
    isMember: userIsMember(context),
    update: updateUser(context),
  },
  profile: {
    get: getProfile(context),
  },
  organization: {
    isAvailable: organizationIsAvailable(context),
    getForUser: getOrganizationForUser(context),
    getForPublic: getOrganizationForPublic(context),
    create: createOrganization(context),
    update: updateOrganization(context),
    delete: deleteOrganization(context),
    inviteMember: organizationInviteMember(context),
    getInvites: getOrganizationInvites(context),
    deleteInvite: deleteOrganizationInvite(context),
    confirmInvite: confirmOrganizationInvite(context),
    joinWithHash: joinOrganizationWithHash(context),
    generateNewInviteLink: generateNewOrganizationInviteLink(context),
    getMembers: getOrganizationMembers(context),
    setMemberRole: setOrganizationMemberRole(context),
    leave: leaveOrganization(context),
    getOffices: getOrganizationOffices(context),
  },
  office: {
    setFavorite: setOfficeFavorite(context),
    unsetFavorite: unsetOfficeFavorite(context),
    isAvailable: officeIsAvailable(context),
    create: createOffice(context),
  },
})

export type Core = ReturnType<typeof createCore>
