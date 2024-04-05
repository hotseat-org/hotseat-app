import { imageService } from '~/services/images'
import { createOfficeMapper } from './office'
import { createProfileMapper } from './profile'
import { createUserMapper } from './user'

export const mappers = {
  user: createUserMapper(imageService),
  profile: createProfileMapper(imageService),
  office: createOfficeMapper(imageService),
}
