import type { Seat } from '../seat/types'

export interface Reservation {
  id: string
  userId: string
  seat: Seat
}
