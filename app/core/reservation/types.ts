import type { User } from '../user/types'

export interface Reservation {
  id: string
  by: User
}
