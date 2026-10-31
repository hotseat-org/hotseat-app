import { useTheme } from "remix-themes"
import { useScheme } from "~/utils/hooks/useScheme"

/**
 * For a full-screen layer on a phone: fixed strips at the screen's top and
 * bottom in its own colour (inherited), for Safari (iOS 26) to tint its
 * status bar and toolbar from — it takes a fixed element over 10px deep at
 * each edge, and kept a full-screen dialog's old colour after a theme or
 * colour scheme change. New strips on each change: a new element is read
 * afresh. Phones only; inside the layer's padding, so nothing shows.
 */
export const EdgeStrips = () => {
  const [theme] = useTheme()
  const [scheme] = useScheme()
  const look = `${theme}-${scheme}`

  return (
    <>
      <div
        key={`top-${look}`}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[11px] bg-inherit md:hidden"
      />
      <div
        key={`bottom-${look}`}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-3 bg-inherit md:hidden"
      />
    </>
  )
}
