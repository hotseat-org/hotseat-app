import type { MockGoogleUser } from '~/repositories/user/mock-google/types'

// https://developers.google.com/admin-sdk/directory/v1/guides/manage-users#get_user
export const mockedGoogleUsers: MockGoogleUser[] = [
  {
    id: '1',
    primaryEmail: 'josef.vidlak@qest.cz',
    isAdmin: true,
    name: {
      givenName: 'Josef',
      familyName: 'Vidlák',
      fullName: 'Josef Vidlák',
    },
  },
  {
    id: '2',
    primaryEmail: 'radek.repka@qest.cz',
    isAdmin: true,
    name: {
      givenName: 'Radek',
      familyName: 'Řepka',
      fullName: 'Radek Řepka',
    },
  },
]

export const mockedUsers = new Map(
  mockedGoogleUsers.map((user) => [user.primaryEmail, user])
)
