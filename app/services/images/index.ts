import { cloudflareImageService } from "./cloudflare.server"
import { isLocalImageStorage, localImageService } from "./local.server"

/**
 * Where images are kept (IMAGE_STORAGE): "local", on this server's disk
 * (IMAGES_DIR), or "cloudflare", Cloudflare Images with its CLOUDFLARE_* keys
 * (the hosted service's — or a self-hosted installation's own account). Unset:
 * local when IMAGES_DIR is set, else Cloudflare.
 */
const IMAGE_STORAGE = process.env.IMAGE_STORAGE || (isLocalImageStorage ? "local" : "cloudflare")

export const imageService = IMAGE_STORAGE === "local" ? localImageService : cloudflareImageService
