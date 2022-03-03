import { useLoaderData } from 'remix'

export type LoaderReturnType<Loader extends (...args: unknown[]) => unknown> =
  Awaited<ReturnType<Loader>>

export const dataLoader = <Data extends unknown>(
  loader: () => Promise<Data>
) => ({
  loader,
  useData: () => useLoaderData<Data>(),
})
