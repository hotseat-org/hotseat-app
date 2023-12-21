import { LoaderFunctionArgs, redirect } from '@remix-run/server-runtime'
import { ImageResponse } from '@vercel/og'
import { createHash } from 'crypto'
import { getCore } from '~/core/get-core'

export const runtime = 'edge'

const md5 = (value: string) => createHash('md5').update(value).digest('hex')

export const loader = async ({
  request,
  params: { slug },
}: LoaderFunctionArgs) => {
  if (!slug) return redirect('/')

  const core = getCore()
  const organization = await core.organization.getForPublic({ slug })

  if (!organization) return redirect('/')

  const requestEtag = request.headers.get('if-none-match')
  const dataHash = md5(`${organization.name}.${organization.thumbnailUrl}`)

  if (requestEtag === dataHash) {
    return new Response(undefined, {
      status: 304,
    })
  }

  const response = new ImageResponse(
    (
      <div tw="flex p-16 bg-black text-white w-full h-full">
        <img
          alt={organization.name}
          height={200}
          src={organization.thumbnailUrl}
        />
        <p tw="text-9xl">{organization.name}</p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )

  response.headers.set('cache-control', 'max-age=60')
  response.headers.set('etag', dataHash)

  return response
}
