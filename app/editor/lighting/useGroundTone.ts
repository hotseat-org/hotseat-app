import { useEffect } from "react"
import { useEditorStore } from "../store"
import { getNightness } from "./daylight"

/** Past this far into night, a light theme's ground is dark enough to need light text. */
const DARK_GROUND_NIGHTNESS = 0.5

/**
 * The app's words sit straight on the office's ground (no panels), so their
 * colours follow its light: when the scene's night darkens a light theme's
 * ground, the page takes the dark theme's colours (`data-ground="dark"` on the
 * root, see tailwind.css) until morning. Re-renders only when that flips, not
 * with every minute of the clock. The flat plan has no lighting: no change.
 */
export const useGroundTone = ({ isDark, isLit }: { isDark: boolean; isLit: boolean }) => {
  const isNight = useEditorStore((state) => getNightness(state.timeOfDay) > DARK_GROUND_NIGHTNESS)
  const isDarkGround = isLit && !isDark && isNight

  useEffect(() => {
    if (!isDarkGround) return

    const root = document.documentElement
    root.dataset.ground = "dark"

    return () => {
      delete root.dataset.ground
    }
  }, [isDarkGround])
}
