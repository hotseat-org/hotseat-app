import slugify from 'slugify'
import type { CoreContext } from '../types'

export const officeIsAvailable =
  ({ mainRepository }: CoreContext) =>
  async (name: string, organizationSlug: string): Promise<boolean> => {
    const slug = slugify(name, { lower: true, trim: true })

    const office = await mainRepository.office.find({
      filter: { slug, organizationSlug },
    })

    return !office
  }
