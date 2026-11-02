import { useCallback } from "react"
import { useSearchParams } from "react-router"

const PARAM = "person"

/**
 * A colleague's profile over the office (`?person=<email>`): which one is
 * open, and opening or closing it. In the URL, so it can be shared and
 * survives a reload.
 */
export const usePersonProfile = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const email = searchParams.get(PARAM)

  const open = useCallback(
    (personEmail: string) =>
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set(PARAM, personEmail)

        return next
      }),
    [setSearchParams]
  )

  const close = useCallback(
    () =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete(PARAM)

          return next
        },
        { replace: true }
      ),
    [setSearchParams]
  )

  return { email, open, close }
}
