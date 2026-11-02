import { clearStaleDemos, startDemo } from "./demo"
import { getInstallation, joinInstallationByDomain, setUpInstallation } from "./installation"
import { createOffice } from "./office/create"
import {
  closeOfficeDays,
  listClosedDays,
  reopenOfficeDays,
  setOfficeWeekdays,
} from "./office/opening"
import { getOffice } from "./office/get"
import { saveOfficeLayout } from "./office/saveLayout"
import { updateOffice } from "./office/update"
import { deleteOffice } from "./office/delete"
import { officeIsAvailable } from "./office/isAvailable"
import { setOfficeFavorite } from "./office/setFavorite"
import { unsetOfficeFavorite } from "./office/unsetFavorite"
import { confirmOrganizationInvite } from "./organization/confirmInvite"
import { createOrganization } from "./organization/create"
import { deleteOrganization } from "./organization/delete"
import { deleteOrganizationInvite } from "./organization/deleteInvite"
import { generateNewOrganizationInviteLink } from "./organization/generateNewInviteLink"
import { getOrganizationForPublic } from "./organization/getForPublic"
import { getOrganizationForUser } from "./organization/getForUser"
import { getOrganizationInvites } from "./organization/getInvites"
import { getOrganizationMembers, listOrganizationMembers } from "./organization/getMembers"
import { getOrganizationOffices, listOrganizationOffices } from "./organization/getOffices"
import { importOrganizationMembers } from "./organization/importMembers"
import { organizationInviteMember } from "./organization/inviteMember"
import { organizationIsAvailable } from "./organization/isAvailable"
import { joinOrganizationWithHash } from "./organization/joinWithHash"
import { listNotifications, markNotificationsRead } from "./notification"
import { getOfficesOccupancy } from "./office/occupancy"
import { getOfficeInsights } from "./office/insights"
import { deleteRoomKit, listRoomKits, saveRoomKit } from "./office/roomKits"
import { getOrganizationLanding, getUserLanding } from "./user/landing"
import { listUserOrganizations } from "./user/listOrganizations"
import { listDeskReleases, reclaimDesk, releaseDesk } from "./reservation/release"
import { leaveOrganization, removeOrganizationMember } from "./organization/leave"
import { setOrganizationMemberRole } from "./organization/setMemberRole"
import { updateOrganization } from "./organization/update"
import { getProfile } from "./profile/get"
import { cancelReservations } from "./reservation/cancel"
import { listOfficeBookings, listReservations } from "./reservation/list"
import { getMyBookings } from "./reservation/mine"
import { reserveDesk } from "./reservation/reserve"
import {
  getDeskPreferences,
  setSeatRules,
  joinWaitlist,
  leaveWaitlist,
  removeUsualDesk,
  runBookingJobs,
  setFavoriteDesk,
  setUsualDesk,
} from "./reservation/preferences"
import {
  deleteTeam,
  listOfficeTeams,
  listOfficeZones,
  listTeams,
  saveTeam,
} from "./team"
import type { CoreContext } from "./types"
import { createUser } from "./user/create"
import { getUser } from "./user/get"
import { getUserOrganizationInvites } from "./user/getOrganizationInvites"
import { getUserOrganizations } from "./user/getOrganizations"
import { userIsMember } from "./user/isMember"
import { updateUser } from "./user/update"

export const createCore = (context: CoreContext) => ({
  user: {
    get: getUser(context),
    create: createUser(context),
    getOrganizations: getUserOrganizations(context),
    listOrganizations: listUserOrganizations(context),
    getOrganizationInvites: getUserOrganizationInvites(context),
    isMember: userIsMember(context),
    landing: getUserLanding(context),
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
    listMembers: listOrganizationMembers(context),
    setMemberRole: setOrganizationMemberRole(context),
    importMembers: importOrganizationMembers(context),
    leave: leaveOrganization(context),
    removeMember: removeOrganizationMember(context),
    getOffices: getOrganizationOffices(context),
    listOffices: listOrganizationOffices(context),
    landing: getOrganizationLanding(context),
    /** The current slug of an organization renamed away from `oldSlug`. */
    renamedTo: (oldSlug: string) => context.mainRepository.slugRedirect.findOrganization(oldSlug),
  },
  office: {
    get: getOffice(context),
    setFavorite: setOfficeFavorite(context),
    unsetFavorite: unsetOfficeFavorite(context),
    isAvailable: officeIsAvailable(context),
    create: createOffice(context),
    saveLayout: saveOfficeLayout(context),
    update: updateOffice(context),
    delete: deleteOffice(context),
    occupancyToday: getOfficesOccupancy(context),
    insights: getOfficeInsights(context),
    closedDays: listClosedDays(context),
    closeDays: closeOfficeDays(context),
    reopenDays: reopenOfficeDays(context),
    setWeekdays: setOfficeWeekdays(context),
    listKits: listRoomKits(context),
    saveKit: saveRoomKit(context),
    deleteKit: deleteRoomKit(context),
    renamedTo: (organizationSlug: string, oldSlug: string) =>
      context.mainRepository.slugRedirect.findOffice(organizationSlug, oldSlug),
  },
  team: {
    list: listTeams(context),
    listForOffice: listOfficeTeams(context),
    officeZones: listOfficeZones(context),
    save: saveTeam(context),
    delete: deleteTeam(context),
  },
  reservation: {
    list: listReservations(context),
    listForOffice: listOfficeBookings(context),
    reserve: reserveDesk(context),
    preferences: getDeskPreferences(context),
    setFavorite: setFavoriteDesk(context),
    setUsual: setUsualDesk(context),
    removeUsual: removeUsualDesk(context),
    setSeatRules: setSeatRules(context),
    joinWaitlist: joinWaitlist(context),
    leaveWaitlist: leaveWaitlist(context),
    runJobs: runBookingJobs(context),
    cancel: cancelReservations(context),
    mine: getMyBookings(context),
    release: releaseDesk(context),
    reclaim: reclaimDesk(context),
    releases: listDeskReleases(context),
  },
  installation: {
    get: getInstallation(context),
    setUp: setUpInstallation(context),
    joinByDomain: joinInstallationByDomain(context),
  },
  demo: {
    start: startDemo(context),
    clearStale: clearStaleDemos(context),
  },
  notification: {
    list: listNotifications(context),
    markRead: markNotificationsRead(context),
  },
})

export type Core = ReturnType<typeof createCore>
