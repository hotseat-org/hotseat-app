/** An image as kept: its bytes and type ("image/png"). */
export interface StoredImage {
  bytes: Uint8Array
  type: string
}

export interface ImageService {
  /** Where the browser posts an image (form field "file"); it answers `{ result: { id } }`. */
  getUploadUrl: () => Promise<{ imageId: string; uploadUrl: URL }>
  /** An image's address to show (`variant`: the size wanted, where sizes exist). */
  getSignedUrl: (url: string, variant: string) => Promise<string>
  /** A copy of the image at `url` (someone's photo from their sign-in): its id. */
  importFromUrl: (url: string) => Promise<string>
  /** An image's bytes, as uploaded (for an organization's export), or null. */
  read: (id: string) => Promise<StoredImage | null>
  /** Keep these bytes as a new image (from an export): its id. */
  save: (image: StoredImage) => Promise<string>
}
