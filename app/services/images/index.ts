import { cloudflareImageService } from "./cloudflare.server"
import { isLocalImageStorage, localImageService } from "./local.server"

/** Images on the server's own disk when IMAGES_DIR is set (self-hosting), else Cloudflare Images. */
export const imageService = isLocalImageStorage ? localImageService : cloudflareImageService
