import type { Reservation } from '../reservation/types'
import type { Seat } from '../seat/types'

export interface User {
  id: string
  displayName?: string
  photo?: string
  reservations: Reservation[]
  seatsResident: Seat[]
}
