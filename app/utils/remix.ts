import { useLoaderData } from '@remix-run/react'

export const dataLoader = <Data extends unknown>(
  loader: () => Promise<Data>
) => ({
  loader,
  useData: () => useLoaderData<Data>(),
})
