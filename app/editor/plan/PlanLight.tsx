import { useEffect, useRef } from "react"
import { useEditorStoreApi } from "../store"
import { getLightTint } from "../lighting/groundColor"

/**
 * The time of day over the flat plan: a layer that multiplies the drawing by
 * the scene's light at that hour (getLightTint) — none at noon, dimmer and
 * bluer towards night, as the 3D office. Above the drawing, under the labels
 * and faces (they stay as bright as in 3D). Its colour is written straight to
 * the element as the time changes (no React render).
 */
export const PlanLight = ({ isDark }: { isDark: boolean }) => {
  const store = useEditorStoreApi()
  const layer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const apply = (time: number) => {
      const tint = getLightTint(time, isDark)
      if (layer.current)
        layer.current.style.background = `rgb(${tint.map((channel) => Math.round(channel * 255)).join(" ")})`
    }
    apply(store.getState().timeOfDay)

    return store.subscribe((state, previous) => {
      if (state.timeOfDay !== previous.timeOfDay) apply(state.timeOfDay)
    })
  }, [store, isDark])

  return (
    <div
      ref={layer}
      aria-hidden
      className="pointer-events-none absolute inset-0 mix-blend-multiply"
    />
  )
}
