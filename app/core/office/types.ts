export interface Office {
  slug: string
  organizationSlug: string
  name: string
  /** Legacy Smplrspace id — no longer used. */
  spaceId?: string
  thumbnail?: string
  description?: string
  /** 3D editor scene — array of placed objects. */
  layout?: unknown
  /** IANA timezone that decides "today" for bookings. */
  timezone: string
  /** How many days ahead people can book. */
  bookingWindowDays: number
}
