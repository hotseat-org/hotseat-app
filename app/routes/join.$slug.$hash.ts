import {
  MetaFunction,
  json,
  redirect,
  type LoaderFunctionArgs,
} from '@vercel/remix'
import { getCore } from '~/core/get-core'
import { authenticator } from '~/services/auth.server'
import login from './login'

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Join ${data?.slug}` },
    { property: 'og:description', content: 'Just do it!' },
    {
      property: 'og:title',
      content: `Join ${data?.slug}`,
    },
    {
      property: 'og:image',
      content: `https://e2e5-212-20-119-14.ngrok-free.app/images/og/join-organization/${data?.slug}`,
    },
  ]
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await authenticator.isAuthenticated(request)

  const slug = params.slug
  const hash = params.hash

  if (!slug || !hash) return redirect('/')

  if (user) {
    const core = getCore()

    try {
      const profile = await core.organization.joinWithHash({
        email: user.email,
        hash,
      })

      return redirect(`/o/${profile.organizationSlug}`)
    } catch (e) {
      return redirect('/')
    }
  }

  return json({ slug })
}

export default login
