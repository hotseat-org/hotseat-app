import { useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import {
  DepthStencilFormat,
  Layers,
  MaterialBlending,
  UnsignedByteType,
  UnsignedInt248Type,
  type Camera,
  type OrthographicCamera,
  type Scene,
  Vector2,
} from "three"
import {
  Fn,
  abs,
  float,
  int,
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
  rtt,
  sample,
  textureSize,
  uv,
  vec2,
  saturation,
  unpackRGBToNormal,
  vec4,
} from "three/tsl"
import {
  BlendMode,
  PassNode,
  RenderPipeline,
  type Node,
  type TextureNode,
  type NodeFrame,
  type WebGPURenderer,
} from "three/webgpu"
import { ao } from "three/examples/jsm/tsl/display/GTAONode.js"
import { OUTLINE_LAYER, shownOutlines } from "../objects/outlineLayer"
import { DEPTH_BIAS } from "../objects/PieceOutline"

/** Ambient occlusion: its reach (m) and strength (×), at half the screen's resolution. */
const OCCLUSION = { radius: 0.6, scale: 1.1, resolution: 0.5 }
/**
 * Occlusion this close to none counts as none. On open ground GTAO still finds
 * a shade of about 1%, growing with distance — kept in 8 bits, it showed as
 * faint stripes across the ground when zoomed out.
 */
const UNOCCLUDED = 0.96
/** How much nearer or farther a neighbour may be (× the distance) to be smoothed with. */
const SMOOTHING_DEPTH_TOLERANCE = 0.05
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
  /** Its target was last drawn empty, at this size (drawing buffer px): no need to again. */
  private readonly clearedSize = new Vector2()
  private isCleared = false

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

    // No outlines showing: drawn empty once (cleared), then left as it is.
    const size = renderer.getDrawingBufferSize(drawingBufferSize)
    const isEmpty = shownOutlines.size === 0
    if (isEmpty && this.isCleared && size.equals(this.clearedSize)) return

    this.isCleared = isEmpty
    this.clearedSize.copy(size)

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

const drawingBufferSize = new Vector2()

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
 * GTAO's occlusion, smoothed. It's noisy by itself: its samples turn per pixel,
 * in a pattern that repeats every 5×5 pixels — so the average over 5×5 takes
 * the noise out. Only neighbours about as far away count, or the shade would
 * bleed over an edge onto what's behind. At the occlusion's own resolution
 * (half): three's DenoiseNode did as well for about 1 ms more a frame, with
 * 17 lookups of the occlusion, depth and normals at every screen pixel.
 */
const smoothOcclusion = (occlusion: TextureNode, depth: TextureNode, camera: Camera) => {
  const average = Fn(() => {
    const size = textureSize(occlusion, int(0)) as unknown as Node<"ivec2">
    const texel = vec2(1).div(vec2(size))
    const getDistance = (at: Node<"vec2">) => getViewZ(depth.sample(at).r, camera)
    const centerDistance = getDistance(uv())
    const tolerance = abs(centerDistance).mul(SMOOTHING_DEPTH_TOLERANCE)
    const sum = float(0).toVar()
    const weights = float(0).toVar()

    for (let x = -2; x <= 2; x++)
      for (let y = -2; y <= 2; y++) {
        const at = uv().add(vec2(x, y).mul(texel))
        const difference = abs(getDistance(at).sub(centerDistance))
        const weight = float(1).sub(difference.div(tolerance).saturate())
        sum.addAssign(occlusion.sample(at).r.mul(weight))
        weights.addAssign(weight)
      }

    return sum.div(weights) // never 0: the centre counts in full
  })()

  const smoothed = rtt(average as unknown as Node, null, null, { type: UnsignedByteType })
  smoothed.setResolutionScale(OCCLUSION.resolution)

  return smoothed as unknown as Node<"vec4">
}

/**
 * Post-processing (display mode only), in TSL: ambient occlusion (GTAO), the
 * pieces' outlines (their own pass, see outlineLayer.ts), ACES tone mapping
 * and a light grade. No vignette: the corners stay as bright as the rest. No tilt-shift: its blur towards the top and
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
      // default half floats), unpacked where they're read. Blended like each
      // material, with no alpha: solid surfaces don't blend, so nothing
      // changes for them, but see-through ones (glass) leave the normals of
      // what's behind them — else the occlusion shades the pane as if it were
      // a wall, and smears that over everything seen through it.
      const outputs = mrt({ output, normal: vec4(packNormalToRGB(normalView), 0) })
      outputs.setBlendMode("normal", new BlendMode(MaterialBlending))
      scenePass.setMRT(outputs)
      scenePass.getTexture("normal").type = UnsignedByteType
      const packedNormals = scenePass.getTextureNode("normal")
      const normals = sample((at: Node<"vec2">) => unpackRGBToNormal(packedNormals.sample(at)))
      const sceneDepth = scenePass.getTextureNode("depth")
      const occlusion = ao(sceneDepth, normals, camera)
      occlusion.radius.value = OCCLUSION.radius
      occlusion.scale.value = OCCLUSION.scale
      occlusion.resolutionScale = OCCLUSION.resolution
      const smoothed = smoothOcclusion(occlusion.getTextureNode(), sceneDepth, camera)

      return sceneColor.rgb.mul(smoothed.r.div(UNOCCLUDED).min(1))
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

    // Tone mapped and in the screen's colours, then graded.
    const toned = renderOutput(vec4(outlined, 1)).rgb
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
