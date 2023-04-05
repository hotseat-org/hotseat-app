import { useLoaderData, useMatches } from '@remix-run/react'
import { useMemo } from 'react'
import type { User } from '~/core/user/types'

export const dataLoader = <Data extends unknown>(
  loader: () => Promise<Data>
) => ({
  loader,
  useData: () => useLoaderData<Data>(),
})

export function useMatchesData(
  id: string
): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches()

  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id]
  )

  return route?.data
}

function isUser(user: any): user is User {
  return user && typeof user === 'object' && typeof user.id === 'string'
}

export function useUser(): User {
  const data = useMatchesData('root')

  if (data && isUser(data.user)) {
    return data.user
  }

  throw new Error('User must be logged in')
}
