import { Component, useEffect, useRef, type ReactNode } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Matrix4 } from "three"
import {
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  N8AO,
  TiltShift2,
  TiltShiftEffect,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing"
import { ToneMappingMode } from "postprocessing"
import { hasMatrixMoved } from "../camera/cameraMotion"

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
/** Denoise passes over the occlusion: full while still, one while moving. */
const DENOISE_STILL = 2
const DENOISE_MOVING = 1
/** Tilt-shift blur samples per pixel: full while still, a few while moving. */
const TILT_SAMPLES_STILL = 10
const TILT_SAMPLES_MOVING = 3

/**
 * Ambient occlusion and the tilt-shift stay on, but are cheaper while the
 * camera moves (orbit, pan, zoom, glide): one denoise pass instead of two, a
 * few blur samples instead of ten — neither shows in motion. Both are back to
 * full as soon as the camera settles. Only pass and sample counts change, so
 * switching never recompiles a shader.
 */
const useLighterWhileMoving = () => {
  // The N8AO pass.
  const occlusion = useRef<{
    configuration: { denoiseIterations: number; transparencyAware: boolean }
    autoDetectTransparency: boolean
  }>(null)
  // The tilt-shift effect.
  const tiltShift = useRef<TiltShiftEffect>(null)
  const view = useRef({ world: new Matrix4(), projection: new Matrix4() })
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => () => clearTimeout(settle.current ?? undefined), [])
  // Default priority: runs before the composer renders this frame.
  useFrame(({ camera }) => {
    const pass = occlusion.current
    if (!pass) return
    // N8AO spots any transparent material (the terrain's lines, window glass)
    // and then renders the scene twice more every frame, walking the whole
    // scene graph four times, so AO doesn't darken things seen through glass.
    // Not worth it here: off — checked every frame, as the pass turns it back
    // on when it's (re)configured after mounting.
    if (pass.autoDetectTransparency || pass.configuration.transparencyAware) {
      pass.autoDetectTransparency = false
      pass.configuration.transparencyAware = false
    }

    const last = view.current
    if (
      !hasMatrixMoved(last.world, camera.matrixWorld) &&
      !hasMatrixMoved(last.projection, camera.projectionMatrix)
    )
      return

    last.world.copy(camera.matrixWorld)
    last.projection.copy(camera.projectionMatrix)
    pass.configuration.denoiseIterations = DENOISE_MOVING
    if (tiltShift.current) tiltShift.current.samples = TILT_SAMPLES_MOVING

    clearTimeout(settle.current ?? undefined)
    settle.current = setTimeout(() => {
      pass.configuration.denoiseIterations = DENOISE_STILL
      if (tiltShift.current) tiltShift.current.samples = TILT_SAMPLES_STILL

      invalidate()
    }, SETTLE)
  })

  return { occlusion, tiltShift }
}

/**
 * Post-processing (display mode only): N8AO ambient occlusion; vignette, ACES
 * tone mapping and a light grade (a touch more colour and contrast — merged
 * into one pass with the vignette, so nearly free); and a gentle tilt-shift
 * blur towards the top and bottom for a miniature, diorama look (its own pass,
 * lighter while moving). No bloom: it only ever caught the screens and bulbs —
 * they have halos now (see Halos) — and its blur passes ran over the whole
 * screen every frame. Wrapped in a boundary so a failed pass degrades
 * gracefully.
 */
export const PostFx = ({ highQuality = false }: Props) => {
  const { occlusion, tiltShift } = useLighterWhileMoving()

  return (
    <SilentBoundary>
      {/* 2× MSAA: enough for the soft, rounded furniture; the composer's
          buffers are full-screen, and 4× costs real bandwidth on integrated
          and mid-range GPUs. Thin lines (the terrain) smooth themselves.
          A stencil, for the pieces' outlines (see PieceOutline). */}
      <EffectComposer multisampling={2} enableNormalPass={false} stencilBuffer>
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
        {/* ACES greys light colours a little: win back some colour and snap. */}
        <HueSaturation saturation={0.1} />
        <BrightnessContrast contrast={0.06} />
        {/* In focus across the middle, softly blurred towards top and bottom. */}
        <TiltShift2
          ref={tiltShift}
          blur={0.045}
          taper={0.32}
          start={[0, 0.5]}
          end={[1, 0.5]}
          samples={TILT_SAMPLES_STILL}
        />
      </EffectComposer>
    </SilentBoundary>
  )
}
