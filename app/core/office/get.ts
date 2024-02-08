import type { CoreContext } from '../types'
import { Office } from './types'

interface GetOfficeArgs {
  slug: string
  organizationSlug: string
}

export const getOffice =
  ({ mainRepository }: CoreContext) =>
  async ({ slug, organizationSlug }: GetOfficeArgs): Promise<Office> => {
    const office = await mainRepository.office.find({
      filter: { organizationSlug, slug },
    })

    if (!office) throw new Error('Not Found')

    return office
  }
