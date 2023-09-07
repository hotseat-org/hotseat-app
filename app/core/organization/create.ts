import slugify from 'slugify'
import { getCore } from '../get-core'
import type { CoreContext } from '../types'
import type { Organization } from './types'

export interface CreateOrganizationArgs {
  name: string
  userId: string
}

export const createOrganization =
  ({ mainRepository }: CoreContext) =>
  async ({ name, userId }: CreateOrganizationArgs): Promise<Organization> => {
    const core = getCore()

    const isAvailable = await core.organization.isAvailable(name)

    if (!isAvailable)
      throw new Error(`Organization with name: ${name} already exists`)

    const slug = slugify(name, { lower: true, trim: true })
    const organization = await mainRepository.organization.create({
      name,
      creatorId: userId,
      slug,
    })

    return organization
  }
