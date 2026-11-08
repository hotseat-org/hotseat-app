import { useEffect } from "react"
import { useEditorStoreApi } from "../store"
import { SURFACES } from "../palette"
import { getGroundColor, isGroundDark } from "./groundColor"

/**
 * Undo a change to the root a frame later, unless it's made again by then:
 * the editor remounts when you switch office (or org), and clearing at once
 * would flash the theme's colours for a frame before the new one sets them.
 */
const pendingClears = new Map<string, number>()
const clearLater = (key: string, clear: () => void) => {
  cancelAnimationFrame(pendingClears.get(key) ?? 0)
  pendingClears.set(
    key,
    requestAnimationFrame(() => {
      pendingClears.delete(key)
      clear()
    })
  )
}
const keepNow = (key: string) => {
  cancelAnimationFrame(pendingClears.get(key) ?? 0)
  pendingClears.delete(key)
}

/**
 * The app's words sit on the office's ground, so their colours follow its
 * light. At every change of the time of day, `--ground` on the root takes the
 * ground's colour as the scene draws it (the surfaces behind pages are made
 * of it, so they melt into the land and only show over the model), and a light
 * theme whose ground has gone dark takes the dark theme's colours
 * (`data-ground="dark"`, see tailwind.css). Written straight to the root, no
 * React render. The flat plan has no lighting: its backdrop's colour, all day.
 */
export const useGroundTone = ({ isDark, isLit }: { isDark: boolean; isLit: boolean }) => {
  const store = useEditorStoreApi()

  useEffect(() => {
    const root = document.documentElement
    // The flat plan: its own backdrop, the same all day (it has no lighting).
    if (!isLit) {
      keepNow("ground")
      root.style.setProperty("--ground", SURFACES[isDark ? "dark" : "light"].planBackdrop)
      delete root.dataset.ground

      return () => clearLater("ground", () => root.style.removeProperty("--ground"))
    }

    keepNow("ground")
    const apply = (time: number) => {
      const ground = getGroundColor(time, isDark)
      root.style.setProperty("--ground", `rgb(${ground.join(" ")})`)
      if (!isDark && isGroundDark(ground)) root.dataset.ground = "dark"
      else delete root.dataset.ground
    }
    apply(store.getState().timeOfDay)
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.timeOfDay !== previous.timeOfDay) apply(state.timeOfDay)
    })

    return () => {
      unsubscribe()
      clearLater("ground", () => {
        root.style.removeProperty("--ground")
        delete root.dataset.ground
      })
    }
  }, [store, isDark, isLit])
}
