/** What each request has already loaded, by key; gone with the request. */
const loadedByRequest = new WeakMap<Request, Map<string, Promise<unknown>>>()

/**
 * Loads something once per request, however many loaders ask for it: they
 * run side by side and share the first one's promise (an office page's route
 * and its organization's both need the profile). A request after an action
 * is a new one (React Router makes it for the loaders), so nothing loaded
 * before a change is handed out after it.
 */
export const loadOncePerRequest = <T>(
  request: Request,
  key: string,
  load: () => Promise<T>
): Promise<T> => {
  const loaded = loadedByRequest.get(request) ?? new Map<string, Promise<unknown>>()
  loadedByRequest.set(request, loaded)

  const known = loaded.get(key) as Promise<T> | undefined
  if (known) return known

  const loading = load()
  loaded.set(key, loading)

  return loading
}
