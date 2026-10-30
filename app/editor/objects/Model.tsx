import { useEffect } from "react"
import { Clone, useGLTF } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { markShadowsDirty } from "../lighting/shadows"
import { NO_BAKE } from "./Baked"

interface Props {
  url: string
  scale?: number
  yOffset?: number
  rotationOffset?: number
}

/**
 * Loads a GLB and clones it (so many copies share one download). Wrap usages in
 * <Suspense> — useGLTF suspends while loading. Each model downloads the first
 * time it's shown (a desk pet only once someone has booked that desk).
 */
export const Model = ({ url, scale = 1, yOffset = 0, rotationOffset = 0 }: Props) => {
  const { scene } = useGLTF(url)
  const invalidate = useThree((state) => state.invalidate)
  const renderer = useThree((state) => state.gl)
  // Under frameloop="demand", force a render once the (async) model is ready,
  // otherwise it loads but never draws until the next interaction.
  // Shadows are cached, so they need a redraw to include it too — and to drop
  // it when it goes (a desk pet leaves with its booking).
  useEffect(() => {
    markShadowsDirty(renderer, invalidate)

    return () => markShadowsDirty(renderer, invalidate)
  }, [scene, renderer, invalidate])

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
