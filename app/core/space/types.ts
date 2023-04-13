import type { Seat } from '../seat/types'

export interface Space {
  id: string
  name: string
  spaceId: string
  seats: Seat[]

  description?: string

  createdAt: Date
  updatedAt: Date
}
