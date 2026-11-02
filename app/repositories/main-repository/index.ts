import {
  addFavoriteDesk,
  addToWaitlist,
  findFavoriteDesks,
  findSeatRules,
  findUsualDesks,
  findWaitlist,
  markUsualDeskBooked,
  removeFavoriteDesk,
  removeFromWaitlist,
  removeUsualDesk,
  setSeatRules,
  setUsualDesk,
} from "./methods/desk-preference"
import { createDemoCompany, deleteStaleDemoCompanies } from "./methods/demo"
import {
  createDeskReleases,
  deleteDeskReleases,
  deleteStaleDeskReleases,
  findDeskReleases,
} from "./methods/desk-release"
import {
  createNotifications,
  findNotifications,
  markNotificationsRead,
} from "./methods/notification"
import { createOffice } from "./methods/office/create"
import { createRoomKit, deleteRoomKit, findRoomKits } from "./methods/room-kit"
import {
  addOfficeSlugRedirect,
  addOrganizationSlugRedirect,
  findOfficeSlugRedirect,
  findOrganizationSlugRedirect,
} from "./methods/slug-redirect"
import { deleteOffice } from "./methods/office/delete"
import { findOffice } from "./methods/office/find"
import { findOffices } from "./methods/office/findMany"
import { saveOfficeLayout } from "./methods/office/saveLayout"
import { updateOffice } from "./methods/office/update"
import { createOrganizationInvite } from "./methods/organization-invite/create"
import { deleteOrganizationInvite } from "./methods/organization-invite/delete"
import { findOrganizationInvite } from "./methods/organization-invite/find"
import { findManyOrganizationInvites } from "./methods/organization-invite/findMany"
import { createOrganization } from "./methods/organization/create"
import { deleteOrganization } from "./methods/organization/delete"
import { findOrganization } from "./methods/organization/find"
import { findManyOrganizations, findOrganizationSummaries } from "./methods/organization/findMany"
import { updateOrganization } from "./methods/organization/update"
import { createProfile } from "./methods/profile/create"
import { deleteProfile } from "./methods/profile/delete"
import { findProfile } from "./methods/profile/find"
import { findProfiles } from "./methods/profile/findMany"
import { updateProfile } from "./methods/profile/update"
import { bookReservations } from "./methods/reservation/book"
import { deleteReservations } from "./methods/reservation/deleteMany"
import { findReservations } from "./methods/reservation/findMany"
import { createUser } from "./methods/user/create"
import { findUser } from "./methods/user/find"
import { updateUser } from "./methods/user/update"
import type { MainRepository } from "./types"

export const createMainMysqlRepository = (): MainRepository => {
  return {
    user: {
      create: createUser,
      find: findUser,
      update: updateUser,
    },
    organization: {
      find: findOrganization,
      findMany: findManyOrganizations,
      findSummaries: findOrganizationSummaries,
      create: createOrganization,
      delete: deleteOrganization,
      update: updateOrganization,
    },
    organizationInvite: {
      create: createOrganizationInvite,
      find: findOrganizationInvite,
      findMany: findManyOrganizationInvites,
      delete: deleteOrganizationInvite,
    },
    profile: {
      find: findProfile,
      findMany: findProfiles,
      create: createProfile,
      update: updateProfile,
      delete: deleteProfile,
    },
    office: {
      find: findOffice,
      findMany: findOffices,
      create: createOffice,
      update: updateOffice,
      delete: deleteOffice,
      saveLayout: saveOfficeLayout,
    },
    favoriteDesk: { findMany: findFavoriteDesks, add: addFavoriteDesk, remove: removeFavoriteDesk },
    usualDesk: {
      findMany: findUsualDesks,
      set: setUsualDesk,
      markBooked: markUsualDeskBooked,
      remove: removeUsualDesk,
    },
    seatRules: { find: findSeatRules, set: setSeatRules },
    waitlist: { findMany: findWaitlist, add: addToWaitlist, remove: removeFromWaitlist },
    roomKit: { findMany: findRoomKits, create: createRoomKit, delete: deleteRoomKit },
    deskRelease: {
      findMany: findDeskReleases,
      create: createDeskReleases,
      delete: deleteDeskReleases,
      deleteStale: deleteStaleDeskReleases,
    },
    slugRedirect: {
      addOrganization: addOrganizationSlugRedirect,
      findOrganization: findOrganizationSlugRedirect,
      addOffice: addOfficeSlugRedirect,
      findOffice: findOfficeSlugRedirect,
    },
    notification: {
      create: createNotifications,
      findMany: findNotifications,
      markRead: markNotificationsRead,
    },
    demo: { create: createDemoCompany, deleteStale: deleteStaleDemoCompanies },
    reservation: {
      findMany: findReservations,
      book: bookReservations,
      delete: deleteReservations,
    },
  }
}
