import { mappers } from '~/mappers'
import type { MainRepository } from '~/repositories/main-repository/types'
import type { ImageService } from '~/services/images/types'

export interface CoreContext {
  mainRepository: MainRepository
  imageService: ImageService
  mappers: typeof mappers
}
