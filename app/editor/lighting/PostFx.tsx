import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import {
  DepthStencilFormat,
  Layers,
  UnsignedByteType,
  UnsignedInt248Type,
  type Camera,
  type OrthographicCamera,
  type Scene,
} from "three"
import {
  dot,
  float,
  mix,
  mrt,
  normalView,
  orthographicDepthToViewZ,
  output,
  packNormalToRGB,
  pass,
  perspectiveDepthToViewZ,
  positionView,
  reference,
  renderOutput,
  sample,
  saturation,
  unpackRGBToNormal,
  uv,
  vec3,
  vec4,
} from "three/tsl"
import {
  PassNode,
  RenderPipeline,
  type Node,
  type NodeFrame,
  type WebGPURenderer,
} from "three/webgpu"
import { ao } from "three/examples/jsm/tsl/display/GTAONode.js"
import { denoise } from "three/examples/jsm/tsl/display/DenoiseNode.js"
import { OUTLINE_LAYER } from "../objects/outlineLayer"
import { DEPTH_BIAS } from "../objects/PieceOutline"

/** Ambient occlusion: its reach (m) and strength (×), at half the screen's resolution. */
const OCCLUSION = { radius: 0.6, scale: 1.1, resolution: 0.5 }
/** The vignette: how far it reaches in from the edges, and how dark it gets there. */
const VIGNETTE = { offset: 0.35, darkness: 0.4 }
/** The grade over tone mapping (ACES greys light colours a little): a touch more colour and snap. */
const GRADE = { saturation: 1.1, contrast: 0.06 }

const onLayer = (layer: number) => {
  const layers = new Layers()
  layers.set(layer)

  return layers
}

/**
 * The pieces' outlines alone (their layer), over nothing: no background, a
 * see-through clear — laid over the scene afterwards. With a stencil (an
 * outline goes round its piece, not over it), and each outline's depth as a
 * second output (a depth buffer with a stencil can't be read in WebGPU).
 */
class OutlinePassNode extends PassNode {
  private readonly shownScene: Scene

  constructor(scene: Scene, camera: Camera) {
    super(PassNode.COLOR, scene, camera, { stencilBuffer: true })
    this.shownScene = scene
    const depthStencil = this.renderTarget.depthTexture
    if (depthStencil) {
      depthStencil.format = DepthStencilFormat
      depthStencil.type = UnsignedInt248Type
    }

    this.setLayers(onLayer(OUTLINE_LAYER))
    // How far in front of the camera (m, view space): half floats hold that
    // well enough, and multisample (full floats don't).
    this.setMRT(mrt({ output, outlineViewZ: positionView.z }))
  }

  updateBefore(frame: NodeFrame) {
    const renderer = frame.renderer as unknown as WebGPURenderer
    const background = this.shownScene.background
    const clearAlpha = renderer.getClearAlpha()
    this.shownScene.background = null
    renderer.setClearAlpha(0)
    const result = super.updateBefore(frame)
    this.shownScene.background = background
    renderer.setClearAlpha(clearAlpha)

    return result
  }
}

/** A depth texture's distances in view space (m), for this camera's projection. */
const getViewZ = (depth: Node<"float">, camera: Camera) => {
  const near = reference("near", "float", camera)
  const far = reference("far", "float", camera)
  const toViewZ = (camera as OrthographicCamera).isOrthographicCamera
    ? orthographicDepthToViewZ
    : perspectiveDepthToViewZ

  return toViewZ(depth, near, far)
}

/**
 * Post-processing (display mode only), in TSL: ambient occlusion (GTAO), the
 * pieces' outlines (their own pass, see outlineLayer.ts), a vignette, ACES
 * tone mapping and a light grade. No tilt-shift: its blur towards the top and
 * bottom read as a low-quality render. No bloom: it only ever caught the
 * screens and bulbs — they have halos now (see Halos).
 * It draws the frame itself (R3F's own render stands aside: priority 1).
 */
export const PostFx = ({ highQuality = false }: { highQuality?: boolean }) => {
  const renderer = useThree((state) => state.gl) as unknown as WebGPURenderer
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  const pipeline = useMemo(() => {
    const scenePass = pass(scene, camera)
    scenePass.setLayers(onLayer(0))
    const sceneColor = scenePass.getTextureNode()
    const getOccluded = () => {
      // The scene's normals, drawn in the same pass: what the occlusion leans
      // on. Packed into 8-bit colour (half the memory and bandwidth of the
      // default half floats), unpacked where they're read.
      scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView) }))
      scenePass.getTexture("normal").type = UnsignedByteType
      const packedNormals = scenePass.getTextureNode("normal")
      const normals = sample((at: Node<"vec2">) => unpackRGBToNormal(packedNormals.sample(at)))
      const sceneDepth = scenePass.getTextureNode("depth")
      const occlusion = ao(sceneDepth, normals, camera)
      occlusion.radius.value = OCCLUSION.radius
      occlusion.scale.value = OCCLUSION.scale
      occlusion.resolutionScale = OCCLUSION.resolution
      // GTAO is noisy by itself (its samples turn per pixel): denoised, as
      // three's own example does, it's smooth.
      const smoothed = denoise(occlusion.getTextureNode(), sceneDepth, normals, camera)

      return sceneColor.rgb.mul((smoothed as unknown as Node<"vec4">).r)
    }
    const lit = highQuality ? getOccluded() : sceneColor.rgb

    // The outlines over it — not where the scene stands in front of them. They
    // reach the camera's way a little (DEPTH_BIAS): the floor just past a
    // piece's foot is nearer than the foot itself.
    const outlinePass = new OutlinePassNode(scene, camera)
    const outlines = outlinePass.getTextureNode("output")
    const isInSight = outlinePass
      .getTextureNode("outlineViewZ")
      .r.add(DEPTH_BIAS)
      .greaterThanEqual(getViewZ(scenePass.getTextureNode("depth").r, camera))
    const shown = outlines.a.mul(isInSight.select(1, 0))
    const outlined = lit.mul(float(1).sub(shown)).add(outlines.rgb.mul(isInSight.select(1, 0)))

    // Darker towards the corners, as the old vignette did (not the Eskil one).
    const fromCentre = uv().sub(0.5).mul(VIGNETTE.offset)
    const vignetted = mix(outlined, vec3(1 - VIGNETTE.darkness), dot(fromCentre, fromCentre))
    // Tone mapped and in the screen's colours, then graded.
    const toned = renderOutput(vec4(vignetted, 1)).rgb
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
