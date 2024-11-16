export enum InviteStatus {
  PENDING = "pending",
  EXPIRED = "expired",
}

export interface OrganizationInvite {
  email: string
  createdAt: Date
  expiresAt: Date
  status: InviteStatus
  organizationSlug: string
}
