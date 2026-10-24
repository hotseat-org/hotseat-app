import { Component, useEffect, useRef, type ReactNode } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Matrix4 } from "three"
import { EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing"
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

/** How long the camera must be still (ms) before the occlusion is full quality again. */
const SETTLE = 150
/** Smallest camera change that counts as a move — orbit damping eases out
 *  forever in ever smaller steps, which must not count. */
const MIN_MOVE = 1e-5
/** Denoise passes over the occlusion: full while still, one while moving. */
const DENOISE_STILL = 2
const DENOISE_MOVING = 1

const hasMatrixMoved = (prev: Matrix4, next: Matrix4) =>
  next.elements.some((value, i) => Math.abs(value - prev.elements[i]) > MIN_MOVE)

/**
 * Ambient occlusion stays on, but is cheaper while the camera moves (orbit,
 * pan, zoom, glide): one denoise pass instead of two — the extra grain doesn't
 * show in motion. It's back to full as soon as the camera settles. Only the
 * pass count changes, so switching never recompiles a shader.
 */
const useLighterOcclusionWhileMoving = () => {
  const occlusion = useRef<{ configuration: { denoiseIterations: number } }>(null) // the N8AO pass
  const view = useRef({ world: new Matrix4(), projection: new Matrix4() })
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => () => clearTimeout(settle.current ?? undefined), [])
  // Default priority: runs before the composer renders this frame.
  useFrame(({ camera }) => {
    const pass = occlusion.current
    if (!pass) return
    const last = view.current
    if (
      !hasMatrixMoved(last.world, camera.matrixWorld) &&
      !hasMatrixMoved(last.projection, camera.projectionMatrix)
    )
      return
    last.world.copy(camera.matrixWorld)
    last.projection.copy(camera.projectionMatrix)
    pass.configuration.denoiseIterations = DENOISE_MOVING
    clearTimeout(settle.current ?? undefined)
    settle.current = setTimeout(() => {
      pass.configuration.denoiseIterations = DENOISE_STILL
      invalidate()
    }, SETTLE)
  })
  return occlusion
}

/**
 * Post-processing (display mode only): N8AO ambient occlusion, vignette and
 * ACES tone mapping. No bloom: it only ever caught the
 * screens and bulbs, which their emissive colour lights well enough, and its
 * blur passes ran over the whole screen every frame. Wrapped in a boundary so a
 * failed pass degrades gracefully.
 */
export const PostFx = ({ highQuality = false }: Props) => {
  const occlusion = useLighterOcclusionWhileMoving()
  return (
    <SilentBoundary>
      {/* 2× MSAA: enough for the soft, rounded furniture; the composer's
          buffers are full-screen, and 4× costs real bandwidth on integrated
          and mid-range GPUs. Thin lines (the terrain) smooth themselves. */}
      <EffectComposer multisampling={2} enableNormalPass={false}>
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
        <Vignette eskil={false} offset={0.35} darkness={0.4} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </SilentBoundary>
  )
}
