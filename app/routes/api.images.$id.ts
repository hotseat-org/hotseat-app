import { data, type ActionFunctionArgs } from "react-router"
import { isUploadAllowed, saveImage } from "~/services/images/local.server"

/**
 * An image posted to its signed upload URL (local image storage: see
 * services/images/local.server.ts), answered the way Cloudflare's is.
 */
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const id = params.id ?? ""
  const url = new URL(request.url)
  const expires = Number(url.searchParams.get("expires"))
  const signature = url.searchParams.get("signature") ?? ""
  if (!isUploadAllowed(id, expires, signature)) throw new Response(null, { status: 403 })

  const file = (await request.formData()).get("file")
  if (!(file instanceof File)) return data({ success: false }, { status: 400 })

  try {
    await saveImage(id, new Uint8Array(await file.arrayBuffer()))
  } catch {
    return data({ success: false }, { status: 400 })
  }

  return data({ success: true, result: { id } })
}
