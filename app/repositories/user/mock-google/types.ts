export interface MockGoogleUser {
  id: string
  primaryEmail: string
  isAdmin: boolean
  name: {
    givenName: string
    familyName: string
    fullName: string
  }
}
