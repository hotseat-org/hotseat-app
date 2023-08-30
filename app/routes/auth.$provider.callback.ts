import { returnToPage } from '~/cookies'
import { authenticator } from '../services/auth.server'
import { redirect, type LoaderFunction } from '@vercel/remix'

export const loader: LoaderFunction = async ({ request, params }) => {
  const provider = params.provider

  const successRedirect =
    (await returnToPage.parse(request.headers.get('Cookie'))) ?? '/'

  if (!provider) return redirect('/login')

  await authenticator.authenticate(provider, request, {
    successRedirect,
    failureRedirect: '/login',
  })
}
