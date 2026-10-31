import { useEffect, useState, type RefObject } from "react"
import { composeHexColor } from "~/utils/pageColor"

interface EdgeColors {
  top: string
  bottom: string
}

/**
 * The colours showing at the screen's top and bottom edges under a sheet: the
 * page's own colour dimmed by the scrim at the top, the sheet's at the bottom.
 * Read again whenever the page's theme, scheme or colour changes.
 *
 * Safari (iOS 26) tints its status bar and toolbar from an opaque fixed
 * element at the screen's edge. Under a sheet there's none, only the
 * see-through scrim, so it kept the colour from before: a theme switched in
 * the sheet showed only once it closed. Strips in these colours give it one.
 */
export const useEdgeColors = ({
  scrim,
  sheet,
}: {
  scrim: RefObject<HTMLElement | null>
  sheet: RefObject<HTMLElement | null>
}) => {
  const [colors, setColors] = useState<EdgeColors>()

  useEffect(() => {
    const readColors = () => {
      if (!scrim.current || !sheet.current) return

      const page = getComputedStyle(document.documentElement).backgroundColor
      const dimming = getComputedStyle(scrim.current).backgroundColor
      setColors({
        top: composeHexColor([page, dimming]),
        bottom: composeHexColor([getComputedStyle(sheet.current).backgroundColor]),
      })
    }

    readColors()
    const observer = new MutationObserver(readColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-scheme"],
    })

    return () => observer.disconnect()
  }, [scrim, sheet])

  return colors
}
