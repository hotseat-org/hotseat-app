export interface RepositorySpace {
  id: string
  name: string
  spaceId: string
  description?: string

  createdAt: Date
  updatedAt: Date
}

export interface RepositorySeat {
  id: string
  furnitureId: string

  createdAt: Date
  updatedAt: Date
}

export type CreateSpaceOptions = Pick<
  RepositorySpace,
  'name' | 'spaceId' | 'description'
>

export interface Repository {
  getSpace: (id: string) => Promise<RepositorySpace>
  getSpaces: () => Promise<RepositorySpace[]>
  createSpace: (options: CreateSpaceOptions) => Promise<RepositorySpace>
  getSeat: (furnitureId: string) => Promise<RepositorySeat | null>
  getSeats: (spaceId: string) => Promise<RepositorySeat[]>
  createSeat: (furnitureId: string, spaceId: string) => Promise<RepositorySeat>
}
