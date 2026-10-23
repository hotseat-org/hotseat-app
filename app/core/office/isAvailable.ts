import type { CoreContext } from "../types"
import { officeSlugForName } from "./slug"

export const officeIsAvailable =
  ({ mainRepository }: CoreContext) =>
  async (name: string, organizationSlug: string): Promise<boolean> => {
    const slug = officeSlugForName(name)

    const office = await mainRepository.office.find({
      filter: { slug, organizationSlug },
    })

    return !office
  }
