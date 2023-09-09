export interface ImageService {
  getUploadUrl: () => Promise<{ imageId: string; uploadUrl: URL }>
  getSignedUrl: (url: string, variant: string) => Promise<string>
}
