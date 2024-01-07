import { imageService } from '~/services/images'
import { createProfileMapper } from './profile'
import { createUserMapper } from './user'

export const mappers = {
  user: createUserMapper(imageService),
  profile: createProfileMapper(imageService),
}
