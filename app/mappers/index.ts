import { imageService } from '~/services/images'
import { createUserMapper } from './user'

export const mappers = {
  user: createUserMapper(imageService),
}
