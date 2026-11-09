import { useEffect } from "react"
import { useEditorStoreApi } from "../store"
import { isSceneDark } from "./groundColor"

/**
 * The few words that sit straight on the office's scene — the headline, the
 * top bar, the controls in the bottom-right corner (`.on-scene`) — keep their
 * contrast as its light changes: when a light theme's scene goes dark at
 * night, the root gets `data-scene="dark"` and those take light words (see
 * tailwind.css). Everything on a surface (pages, cards, dialogs) keeps the
 * theme's colours. Written straight to the root as the time changes, no React
 * render. The dark theme's scene is always dark: nothing to change there.
 */
export const useSceneTone = ({ isDark, isEnabled }: { isDark: boolean; isEnabled: boolean }) => {
  const store = useEditorStoreApi()

  useEffect(() => {
    if (!isEnabled || isDark) return

    const root = document.documentElement
    const apply = (time: number) => {
      if (isSceneDark(time, false)) root.dataset.scene = "dark"
      else delete root.dataset.scene
    }
    apply(store.getState().timeOfDay)
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.timeOfDay !== previous.timeOfDay) apply(state.timeOfDay)
    })

    return () => {
      unsubscribe()
      delete root.dataset.scene
    }
  }, [store, isDark, isEnabled])
}
