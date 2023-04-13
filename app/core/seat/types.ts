import type { Reservation } from '../reservation/types'
import type { User } from '../user/types'

export interface Seat {
  id: string
  furnitureId: string
  reservations: Reservation[]

  resident?: User
}
