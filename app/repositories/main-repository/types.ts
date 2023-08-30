import type { CreateReservationArgs } from './methods/createReservation'
import type { FindReservationArgs } from './methods/findReservation'
import type { FindReservationsArgs } from './methods/findReservations'
import type { FindSeatArgs } from './methods/findSeat'
import type { FindSeatsArgs } from './methods/findSeats'
import type { FindSpaceArgs } from './methods/findSpace'
import type { FindUserArgs } from './methods/findUserByEmail'

export interface Space {
  id: string
  name: string
  spaceId: string
  description?: string
  seats: Seat[]

  createdAt: Date
  updatedAt: Date
}

export interface Seat {
  id: string
  furnitureId: string
  residentId?: string | null
  space: Pick<Space, 'id'>
  reservations?: Reservation[]

  createdAt: Date
  updatedAt: Date
}

export interface Reservation {
  id: string
  userId: string
  seat: Seat

  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  avatarUrl?: string | null
  displayName: string

  createdAt: Date
  updatedAt: Date
}

export type CreateSpaceOptions = Pick<Space, 'name' | 'spaceId' | 'description'>
export type CreateUserArgs = Pick<User, 'email' | 'avatarUrl' | 'displayName'>

export interface MainRepository {
  space: {
    find: (args: FindSpaceArgs) => Promise<Space | null>
    findMany: () => Promise<Space[]>
    create: (options: CreateSpaceOptions) => Promise<Space>
  }
  seat: {
    findByFurniture: (furnitureId: string) => Promise<Seat | null>
    find: (args: FindSeatArgs) => Promise<Seat | null>
    findMany: (args: FindSeatsArgs) => Promise<Seat[]>
    create: (furnitureId: string, spaceId: string) => Promise<Seat>
    update: (id: string, residentId: string | null) => Promise<Seat>
    delete: (id: string) => Promise<void>
  }
  reservation: {
    create: (args: CreateReservationArgs) => Promise<Reservation>
    delete: (id: string) => Promise<void>
    find: (args: FindReservationArgs) => Promise<Reservation | null>
    findMany: (args: FindReservationsArgs) => Promise<Reservation[]>
  }
  user: {
    create: (args: CreateUserArgs) => Promise<User>
    findByEmail: (args: FindUserArgs) => Promise<User | null>
  }
}
