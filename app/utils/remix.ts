import { useLoaderData } from 'remix'

export const dataLoader = <Data extends unknown>(
  loader: () => Promise<Data>
) => ({
  loader,
  useData: () => useLoaderData<Data>(),
})
