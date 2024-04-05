import { Office } from '~/core/office/types'
import type { Office as RepositoryOffice } from '~/repositories/main-repository/types'
import { ImageService } from '~/services/images/types'

export const createOfficeMapper = (imageService: ImageService) => ({
  fromRepository: async (office: RepositoryOffice): Promise<Office> => ({
    ...office,
    thumbnail: office.thumbnail
      ? await imageService.getSignedUrl(office.thumbnail, 'thumbnail')
      : undefined,
  }),
})
