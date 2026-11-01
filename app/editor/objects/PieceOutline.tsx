import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  AlwaysStencilFunc,
  BufferGeometry,
  Color,
  Matrix4,
  Mesh,
  NotEqualStencilFunc,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector2,
  type Group,
  type Object3D,
} from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { ACCENT } from "../palette"

/** Its width (CSS px) and colour: cream pointed at, the accent selected. */
const LOOK = {
  hovered: { color: new Color("#f3e9d6"), width: 2.5 },
  selected: { color: new Color(ACCENT), width: 3.5 },
}
/** How many shifted copies make the outline (round its silhouette, evenly). */
const DIRECTIONS = 12
/**
 * How far its copies are drawn towards the camera (m): the floor just past a
 * piece's foot is nearer than the foot itself, and would hide the outline there.
 */
const DEPTH_BIAS = 0.15
/** Our stencil mark: where the piece itself is (its outline goes round, not over it). */
const STENCIL_MARK = 1

const vertexShader = /* glsl */ `
  uniform float uWidth;
  uniform vec2 uResolution;
  uniform float uDepthBias;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    viewPosition.z += uDepthBias;
    vec4 clipPosition = projectionMatrix * viewPosition;
    float angle = float(gl_InstanceID) * 6.2831853 / ${DIRECTIONS}.0;
    clipPosition.xy += vec2(cos(angle), sin(angle)) * uWidth * 2.0 / uResolution * clipPosition.w;
    gl_Position = clipPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    gl_FragColor = vec4(uColor, uOpacity);
  }
`

/**
 * The one visual language for "clickable" and "selected", in both modes: an
 * outline round the piece's own silhouette — cream pointed at, the accent
 * selected. Its shape is drawn into the stencil, then shifted a few pixels
 * every way round it, outside that mark: an even line hugging the piece, hidden
 * by what stands in front of it. Eases in and out (per frame, no re-renders).
 * It traces what's beside it in its parent (the piece's model, lifted with it).
 */
export const PieceOutline = ({
  shapeKey,
  hovered,
  selected = false,
}: {
  /** Changes when the piece's model does (its shape is traced again). */
  shapeKey: string
  hovered: boolean
  selected?: boolean
}) => {
  const [shape, setShape] = useState<BufferGeometry | null>(null)
  const self = useRef<Group>(null)
  useLayoutEffect(() => {
    const outline = self.current
    const model = outline?.parent
    if (!outline || !model) return

    const outlineShape = composeOutlineShape(model, outline)
    setShape(outlineShape)

    return () => outlineShape?.dispose()
  }, [shapeKey])

  const size = useThree((state) => state.size)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: LOOK.hovered.color.clone() },
          uOpacity: { value: 0 },
          uWidth: { value: LOOK.hovered.width },
          uResolution: { value: new Vector2(1, 1) },
          uDepthBias: { value: DEPTH_BIAS },
        },
        transparent: true,
        depthWrite: false,
        stencilWrite: true,
        stencilRef: STENCIL_MARK,
        stencilFunc: NotEqualStencilFunc,
      }),
    []
  )
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    material.uniforms.uResolution.value.set(size.width, size.height)
  }, [material, size.width, size.height])

  const amount = useRef(0)
  useFrame((state, delta) => {
    const outline = self.current
    if (!outline) return

    const target = hovered || selected ? 1 : 0
    amount.current += (target - amount.current) * Math.min(1, delta * 14)
    outline.visible = amount.current > 0.01
    if (!outline.visible) return

    const look = selected ? LOOK.selected : LOOK.hovered
    material.uniforms.uColor.value.copy(look.color)
    material.uniforms.uWidth.value = look.width * (0.6 + 0.4 * amount.current)
    material.uniforms.uOpacity.value = amount.current
    // Keep animating under frameloop="demand" while easing.
    if (Math.abs(target - amount.current) > 0.005) state.invalidate()
  })

  return (
    <group ref={self} visible={false}>
      {shape && (
        <>
          {/* Where the piece is, in the stencil only — however much is hidden. */}
          <mesh geometry={shape} renderOrder={100} raycast={ignoreRaycast}>
            <meshBasicMaterial
              colorWrite={false}
              depthWrite={false}
              depthTest={false}
              transparent
              stencilWrite
              stencilRef={STENCIL_MARK}
              stencilFunc={AlwaysStencilFunc}
              stencilZPass={ReplaceStencilOp}
            />
          </mesh>
          <instancedMesh
            args={[shape, material, DIRECTIONS]}
            renderOrder={101}
            frustumCulled={false}
            raycast={ignoreRaycast}
          />
        </>
      )}
    </group>
  )
}

/** Never hit: it's how a piece shows it's pointed at, not part of it. */
const ignoreRaycast = () => {}

/**
 * The model's parts merged into one shape (positions only), in its own space:
 * the originals, merged away by baking or not, but not the baked meshes
 * they're merged into (see BAKED_OUTPUT) — nor the outline itself.
 */
const composeOutlineShape = (model: Object3D, outline: Object3D): BufferGeometry | null => {
  model.updateWorldMatrix(true, false)
  const toModel = new Matrix4().copy(model.matrixWorld).invert()
  const parts: BufferGeometry[] = []

  const collect = (object: Object3D) => {
    if (object === outline || object.userData.isBakedOutput) return
    if (!object.visible && !object.userData.isBakedOriginal) return

    if (object instanceof Mesh) {
      object.updateWorldMatrix(true, false)
      const source = object.geometry as BufferGeometry
      const part = new BufferGeometry()
      const flat = source.index ? source.toNonIndexed() : source
      part.setAttribute("position", flat.getAttribute("position").clone())
      part.applyMatrix4(new Matrix4().multiplyMatrices(toModel, object.matrixWorld))
      parts.push(part)
      if (flat !== source) flat.dispose()
    }

    object.children.forEach(collect)
  }
  model.children.forEach(collect)
  if (parts.length === 0) return null

  const shape = mergeGeometries(parts, false)
  parts.forEach((part) => part.dispose())

  return shape
}
