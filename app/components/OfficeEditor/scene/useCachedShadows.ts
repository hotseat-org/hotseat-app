import { useLayoutEffect } from "react"
import { useThree } from "@react-three/fiber"
import { useEditorStoreApi } from "../store"
import { markShadowsDirty } from "./shadows"

/**
 * Cached shadows (see shadows.ts): redraw the shadow maps only when what casts
 * them changes — the layout, the time of day, the theme or the mode. (Pieces
 * that move or re-shape on their own mark them too.) Not on every store
 * update: a desk card or a route is no reason to redraw every shadow.
 */
export const useCachedShadows = (readOnly: boolean, dark: boolean) => {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const storeApi = useEditorStoreApi()
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false
    markShadowsDirty(gl, invalidate)
    return storeApi.subscribe((state, prev) => {
      if (state.objects !== prev.objects || state.timeOfDay !== prev.timeOfDay)
        markShadowsDirty(gl, invalidate)
    })
  }, [gl, invalidate, storeApi])
  useLayoutEffect(() => markShadowsDirty(gl, invalidate), [gl, invalidate, dark, readOnly])
}
