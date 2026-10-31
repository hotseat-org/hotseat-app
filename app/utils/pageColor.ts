import { createContext, useContext, useEffect, type RefObject } from "react"
import { useMatches } from "react-router"
import { useTheme } from "remix-themes"
import { useScheme } from "~/utils/hooks/useScheme"

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

/** Where a page's bars report their colour to the root (undefined: none showing). */
export const BarColorContext = createContext<(color: string | undefined) => void>(() => {})

/** A CSS colour as #rrggbb (computed colours can be color-mix() results, oklab…). */
const getHexColor = (color: string) => {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d")
  if (!context) return color

  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data

  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`
}

/**
 * A page's bars (the phone shell's top bar and tab bar) carry on into the
 * phone's status bar and toolbar: the root takes the colour of `ref`'s
 * element while it's showing, read again on each theme or scheme change.
 */
export const useBarColor = (ref: RefObject<HTMLElement | null>) => {
  const setBarColor = useContext(BarColorContext)
  const [theme] = useTheme()
  const [scheme] = useScheme()

  useEffect(() => {
    const element = ref.current
    if (!element) return

    setBarColor(getHexColor(getComputedStyle(element).backgroundColor))

    return () => setBarColor(undefined)
  }, [ref, setBarColor, theme, scheme])
}
