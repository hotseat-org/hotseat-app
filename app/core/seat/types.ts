import type { Reservation } from '../reservation/types'

export interface Seat {
  id: string
  furnitureId: string
  reservations: Reservation[]

  residentId?: string | null
}
