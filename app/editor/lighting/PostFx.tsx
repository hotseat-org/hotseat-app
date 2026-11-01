import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import {
  colorToDirection,
  directionToColor,
  dot,
  float,
  mix,
  mrt,
  normalView,
  output,
  pass,
  renderOutput,
  saturation,
  uv,
  vec3,
  vec4,
} from "three/tsl"
import { DepthStencilFormat, UnsignedInt248Type } from "three"
import { RenderPipeline, type WebGPURenderer } from "three/webgpu"
import { ao } from "three/examples/jsm/tsl/display/GTAONode.js"

/** Ambient occlusion: its reach (m) and strength (×), at half the screen's resolution. */
const OCCLUSION = { radius: 0.6, scale: 1.1, resolution: 0.5 }
/** The vignette: how far it reaches in from the edges, and how dark it gets there. */
const VIGNETTE = { offset: 0.35, darkness: 0.4 }
/** The grade over tone mapping (ACES greys light colours a little): a touch more colour and snap. */
const GRADE = { saturation: 1.1, contrast: 0.06 }

/**
 * Post-processing (display mode only), in TSL: ambient occlusion (GTAO, from
 * the depth alone), a vignette, ACES tone mapping and a light grade. One
 * render of the scene, then one full-screen pass. No tilt-shift: its blur
 * towards the top and bottom read as a low-quality render. No bloom: it only
 * ever caught the screens and bulbs — they have halos now (see Halos).
 * It draws the frame itself (R3F's own render stands aside: priority 1).
 */
export const PostFx = ({ highQuality = false }: { highQuality?: boolean }) => {
  const renderer = useThree((state) => state.gl) as unknown as WebGPURenderer
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  const pipeline = useMemo(() => {
    // With a stencil: a piece's outline goes round it, not over it (PieceOutline).
    const scenePass = pass(scene, camera, { stencilBuffer: true })
    const depth = scenePass.renderTarget.depthTexture
    if (depth) {
      depth.format = DepthStencilFormat
      depth.type = UnsignedInt248Type
    }

    const sceneColor = scenePass.getTextureNode()
    const getOccluded = () => {
      // The scene's normals, drawn in the same pass: what the occlusion leans on.
      scenePass.setMRT(mrt({ output, normal: directionToColor(normalView) }))
      const normals = colorToDirection(scenePass.getTextureNode("normal"))
      const occlusion = ao(scenePass.getTextureNode("depth"), normals, camera)
      occlusion.radius.value = OCCLUSION.radius
      occlusion.scale.value = OCCLUSION.scale
      occlusion.resolutionScale = OCCLUSION.resolution

      return vec4(sceneColor.rgb.mul(occlusion.getTextureNode().r), sceneColor.a)
    }
    const color = highQuality ? getOccluded() : sceneColor

    // Darker towards the corners, as the old vignette did (not the Eskil one).
    const fromCentre = uv().sub(0.5).mul(VIGNETTE.offset)
    const vignetted = mix(color.rgb, vec3(1 - VIGNETTE.darkness), dot(fromCentre, fromCentre))
    // Tone mapped and in the screen's colours, then graded.
    const toned = renderOutput(vec4(vignetted, color.a)).rgb
    const contrasted = toned
      .sub(0.5)
      .mul(float(1 + GRADE.contrast))
      .add(0.5)
    const graded = saturation(contrasted, GRADE.saturation)

    const result = new RenderPipeline(renderer)
    result.outputColorTransform = false
    result.outputNode = vec4(graded, 1)

    return result
  }, [renderer, scene, camera, highQuality])
  useEffect(() => () => pipeline.dispose(), [pipeline])

  useFrame(() => pipeline.render(), 1)

  return null
}
