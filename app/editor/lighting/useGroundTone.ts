import { useEffect } from "react"
import { useEditorStoreApi } from "../store"
import { getGroundColor, isGroundDark } from "./groundColor"

/**
 * The app's words sit on the office's ground, so their colours follow its
 * light. At every change of the time of day, `--ground` on the root takes the
 * ground's colour as the scene draws it (the surfaces behind pages are made
 * of it, so they melt into the land and only show over the model), and a light
 * theme whose ground has gone dark takes the dark theme's colours
 * (`data-ground="dark"`, see tailwind.css). Written straight to the root, no
 * React render. The flat plan has no lighting: the theme's own colours.
 */
export const useGroundTone = ({ isDark, isLit }: { isDark: boolean; isLit: boolean }) => {
  const store = useEditorStoreApi()

  useEffect(() => {
    if (!isLit) return

    const root = document.documentElement
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
      root.style.removeProperty("--ground")
      delete root.dataset.ground
    }
  }, [store, isDark, isLit])
}
