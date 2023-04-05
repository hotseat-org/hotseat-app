export interface RepositorySpace {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  spaceId: string
  description?: string
}

export type CreateSpaceOptions = Pick<
  RepositorySpace,
  'name' | 'spaceId' | 'description'
>

export interface Repository {
  getSpaces: () => Promise<RepositorySpace[]>
  createSpace: (options: CreateSpaceOptions) => Promise<RepositorySpace>
}
