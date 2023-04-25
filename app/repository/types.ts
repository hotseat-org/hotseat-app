import type { CreateReservationArgs } from './methods/createReservation'
import type { FindReservationArgs } from './methods/findReservation'
import type { FindSeatArgs } from './methods/findSeat'
import type { FindSpaceArgs } from './methods/findSpace'
import type { FindUserArgs } from './methods/findUser'

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
  resident?: User | null
  reservations?: Reservation[]

  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  photos?: {
    url: string
  }[]
  displayName: string | null
  reservations?: Reservation[]
  seatsResident?: Seat[]
}

export interface Reservation {
  id: string
  by: User
  seat: Seat
}

export type CreateSpaceOptions = Pick<Space, 'name' | 'spaceId' | 'description'>
export type CreateUserOptions = Pick<User, 'id' | 'email' | 'displayName'> & {
  photos: string[]
}

export interface Repository {
  space: {
    find: (arfs: FindSpaceArgs) => Promise<Space | null>
    findMany: () => Promise<Space[]>
    create: (options: CreateSpaceOptions) => Promise<Space>
  }
  seat: {
    findByFurniture: (furnitureId: string) => Promise<Seat | null>
    find: (args: FindSeatArgs) => Promise<Seat | null>
    findMany: (spaceId: string) => Promise<Seat[]>
    create: (furnitureId: string, spaceId: string) => Promise<Seat>
    update: (id: string, residentId: string | null) => Promise<Seat>
    delete: (id: string) => Promise<void>
  }
  user: {
    find: (args: FindUserArgs) => Promise<User | null>
    findMany: () => Promise<User[]>
    create: (options: CreateUserOptions) => Promise<User>
  }
  reservation: {
    create: (args: CreateReservationArgs) => Promise<Reservation>
    delete: (id: string) => Promise<void>
    find: (args: FindReservationArgs) => Promise<Reservation | null>
  }
}
