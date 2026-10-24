import { Component, useEffect, useRef, type ReactNode } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Matrix4 } from "three"
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing"
import { ToneMappingMode } from "postprocessing"

/** Renders children, or nothing if a post-processing pass throws — so a bad
 *  effect degrades to "no post-fx" instead of blanking the whole canvas. */
class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface Props {
  /** Display mode adds heavier ambient occlusion. */
  highQuality?: boolean
}

/** How long the camera must be still (ms) before the ambient occlusion returns. */
const SETTLE = 150

/**
 * Ambient occlusion is a third of a frame's cost, and only a soft touch — so
 * it's left out while the camera moves (orbit, pan, zoom, glide) and comes
 * back as soon as it settles. A still view looks exactly the same.
 */
const useOcclusionWhileStill = () => {
  const occlusion = useRef<{ enabled: boolean }>(null) // the N8AO pass
  const view = useRef({ world: new Matrix4(), projection: new Matrix4() })
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => () => clearTimeout(settle.current ?? undefined), [])
  // Default priority: runs before the composer renders this frame.
  useFrame(({ camera }) => {
    const pass = occlusion.current
    if (!pass) return
    const last = view.current
    if (last.world.equals(camera.matrixWorld) && last.projection.equals(camera.projectionMatrix))
      return
    last.world.copy(camera.matrixWorld)
    last.projection.copy(camera.projectionMatrix)
    pass.enabled = false
    clearTimeout(settle.current ?? undefined)
    settle.current = setTimeout(() => {
      pass.enabled = true
      invalidate()
    }, SETTLE)
  })
  return occlusion
}

/**
 * Post-processing. Bloom (neon glow) + vignette + ACES tone mapping run in both
 * modes so the synthwave look is consistent; display mode adds N8AO ambient
 * occlusion (while the camera's still). Wrapped in a boundary so a failed pass
 * degrades gracefully.
 */
export const PostFx = ({ highQuality = false }: Props) => {
  const occlusion = useOcclusionWhileStill()
  return (
    <SilentBoundary>
      <EffectComposer multisampling={4} enableNormalPass={false}>
        {highQuality ? (
          <N8AO
            ref={occlusion}
            halfRes
            aoRadius={1.6}
            intensity={1.3}
            distanceFalloff={1}
            color="#0a0714"
            quality="medium"
          />
        ) : (
          <></>
        )}
        {/* Subtle — only bright accents (the monitor) glow; not a synthwave wash. */}
        <Bloom
          mipmapBlur
          luminanceThreshold={0.95}
          luminanceSmoothing={0.2}
          intensity={0.35}
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.35} darkness={0.4} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </SilentBoundary>
  )
}
