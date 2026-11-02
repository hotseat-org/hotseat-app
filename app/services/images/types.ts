export interface ImageService {
  /** Where the browser posts an image (form field "file"); it answers `{ result: { id } }`. */
  getUploadUrl: () => Promise<{ imageId: string; uploadUrl: URL }>
  /** An image's address to show (`variant`: the size wanted, where sizes exist). */
  getSignedUrl: (url: string, variant: string) => Promise<string>
  /** A copy of the image at `url` (someone's photo from their sign-in): its id. */
  importFromUrl: (url: string) => Promise<string>
}
