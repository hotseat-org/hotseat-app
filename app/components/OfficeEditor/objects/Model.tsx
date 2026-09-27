import { useEffect } from "react"
import { Clone, useGLTF } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { markShadowsDirty } from "../scene/shadows"
import { MODELS } from "../models"
import { NO_BAKE } from "./Baked"

/** Warm the GLB cache for all registered models (client-only). */
export const preloadModels = () => {
  for (const m of MODELS) useGLTF.preload(m.url)
}

interface Props {
  url: string
  scale?: number
  yOffset?: number
  rotationOffset?: number
}

/**
 * Loads a GLB and clones it (so many copies share one download). Wrap usages in
 * <Suspense> — useGLTF suspends while loading. Preload with useGLTF.preload(url).
 */
export const Model = ({ url, scale = 1, yOffset = 0, rotationOffset = 0 }: Props) => {
  const { scene } = useGLTF(url)
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  // Under frameloop="demand", force a render once the (async) model is ready,
  // otherwise it loads but never draws until the next interaction.
  // Shadows are cached, so they need a redraw to include it too.
  useEffect(() => {
    markShadowsDirty(gl, invalidate)
  }, [scene, gl, invalidate])

  return (
    // GLB meshes (loaded async, shared scene graph) stay out of batching.
    <group
      position={[0, yOffset, 0]}
      rotation={[0, rotationOffset, 0]}
      scale={scale}
      userData={NO_BAKE}
    >
      <Clone object={scene} castShadow receiveShadow />
    </group>
  )
}
