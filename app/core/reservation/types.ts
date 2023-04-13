import type { Seat } from '../seat/types'
import type { User } from '../user/types'

export interface Reservation {
  id: string
  by: User
  seat: Seat
}
