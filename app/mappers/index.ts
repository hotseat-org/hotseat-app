import { createOfficeMapper } from "./office"
import { createProfileMapper } from "./profile"
import { createUserMapper } from "./user"
import { imageService } from "~/services/images"

export const mappers = {
  user: createUserMapper(imageService),
  profile: createProfileMapper(imageService),
  office: createOfficeMapper(imageService),
}
