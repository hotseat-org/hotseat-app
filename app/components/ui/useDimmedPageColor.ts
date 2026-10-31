import { useEffect, useState, type RefObject } from "react"
import { composeHexColor } from "~/utils/pageColor"

/**
 * The page's colour as it shows under `scrim`, opaque — read again whenever
 * the page's theme, scheme or colour changes.
 *
 * Safari (iOS 26) tints its status bar from a fixed element over 10px deep at
 * the screen's top edge. Under a sheet that's the see-through scrim, which it
 * blends once and doesn't redo when the theme changes; an opaque strip in
 * this colour gives it one it reads live.
 */
export const useDimmedPageColor = (scrim: RefObject<HTMLElement | null>) => {
  const [color, setColor] = useState<string>()

  useEffect(() => {
    const readColor = () => {
      if (!scrim.current) return

      const page = getComputedStyle(document.documentElement).backgroundColor
      setColor(composeHexColor([page, getComputedStyle(scrim.current).backgroundColor]))
    }

    readColor()
    const observer = new MutationObserver(readColor)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-scheme"],
    })

    return () => observer.disconnect()
  }, [scrim])

  return color
}
