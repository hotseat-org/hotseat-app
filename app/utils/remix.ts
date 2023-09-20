import { useRouteLoaderData } from '@remix-run/react'
import type { User } from '~/core/user/types'

export function useUser(): User {
  const data = useRouteLoaderData<{ user: User }>('root')

  if (data?.user) {
    return data.user
  }

  throw new Error('User must be logged in')
}
