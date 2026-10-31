import { useMatches } from "react-router"

/** A page's own colour, when it isn't the colour scheme's (the login screen's night blue). */
export interface PageColor {
  background: string
  isDark: boolean
}

/** A route's `handle.pageColor`: the colour, or a choice from its loader data. */
type PageColorHandle = { pageColor?: PageColor | ((data: unknown) => PageColor | undefined) }

/**
 * The colour the deepest route showing a page of its own declares (see
 * PageColorHandle) — for what a phone shows round the page (its cutout, the
 * status bar); none, the colour scheme's.
 */
export const usePageColor = (): PageColor | undefined => {
  const matches = useMatches()
  for (const match of [...matches].reverse()) {
    const pageColor = (match.handle as PageColorHandle | undefined)?.pageColor
    const color = typeof pageColor === "function" ? pageColor(match.loaderData) : pageColor
    if (color) return color
  }

  return undefined
}
