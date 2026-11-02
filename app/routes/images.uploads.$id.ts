import type { LoaderFunctionArgs } from "react-router"
import { readImage } from "~/services/images/local.server"

/** A kept image (local image storage). Ids are never reused, so it's cached for good. */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const image = await readImage(params.id ?? "")
  if (!image) throw new Response(null, { status: 404 })

  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
