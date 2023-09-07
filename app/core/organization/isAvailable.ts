import slugify from 'slugify'
import type { CoreContext } from '../types'

export const isAvailable =
  ({ mainRepository }: CoreContext) =>
  async (name: string): Promise<boolean> => {
    const slug = slugify(name, { lower: true, trim: true })

    const organization = await mainRepository.organization.find({ slug })

    return !organization
  }
