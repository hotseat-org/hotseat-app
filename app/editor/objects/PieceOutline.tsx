import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  AlwaysStencilFunc,
  BufferGeometry,
  Color,
  Mesh,
  EqualStencilFunc,
  IncrementStencilOp,
  Vector2,
  type Group,
  type Object3D,
} from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import {
  cameraProjectionMatrix,
  cos,
  float,
  instanceIndex,
  modelViewMatrix,
  positionLocal,
  sin,
  uniform,
  vec2,
  vec4,
} from "three/tsl"
import { MeshBasicNodeMaterial } from "three/webgpu"
import { ACCENT } from "../palette"
import { getMatrixWithin } from "./localMatrix"
import { OUTLINE_LAYER, shownOutlines } from "./outlineLayer"

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
export const DEPTH_BIAS = 0.15
/**
 * The stencil's reference stays 0, the value every pass starts with: three's
 * WebGPU backend remembers the reference it last set across frames, though
 * each new pass resets it to 0 — so a reference of 1 only held on the first
 * frame. So the piece's mark counts up from 0 (whatever the reference), and
 * its outline draws where the stencil is still 0.
 */
const STENCIL_REFERENCE = 0

/**
 * The outline's material (TSL): the piece's shape, drawn once per direction
 * (an instance each), shifted that way on screen by the outline's width —
 * only outside the piece's stencil mark.
 */
const createOutlineMaterial = () => {
  const tint = uniform(LOOK.hovered.color.clone())
  const strength = uniform(0)
  const width = uniform(LOOK.hovered.width)
  const resolution = uniform(new Vector2(1, 1))
  const viewPosition = modelViewMatrix.mul(vec4(positionLocal, 1))
  const clip = cameraProjectionMatrix.mul(
    vec4(viewPosition.xy, viewPosition.z.add(DEPTH_BIAS), viewPosition.w)
  )
  const angle = float(instanceIndex).mul((Math.PI * 2) / DIRECTIONS)
  const shift = vec2(cos(angle), sin(angle)).mul(width).mul(2).div(resolution).mul(clip.w)

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: STENCIL_REFERENCE,
    stencilFunc: EqualStencilFunc,
  })
  material.vertexNode = vec4(clip.xy.add(shift), clip.zw)
  material.colorNode = tint
  material.opacityNode = strength

  return { material, tint, strength, width, resolution }
}

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
  const outlineLook = useMemo(createOutlineMaterial, [])
  const { material } = outlineLook
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    outlineLook.resolution.value.set(size.width, size.height)
  }, [outlineLook, size.width, size.height])

  useEffect(() => {
    const outline = self.current

    return () => {
      if (outline) shownOutlines.delete(outline)
    }
  }, [])

  const amount = useRef(0)
  useFrame((state, delta) => {
    const outline = self.current
    if (!outline) return

    const target = hovered || selected ? 1 : 0
    amount.current += (target - amount.current) * Math.min(1, delta * 14)
    outline.visible = amount.current > 0.01
    if (outline.visible) shownOutlines.add(outline)
    else shownOutlines.delete(outline)
    if (!outline.visible) return

    const look = selected ? LOOK.selected : LOOK.hovered
    outlineLook.tint.value.copy(look.color)
    outlineLook.width.value = look.width * (0.6 + 0.4 * amount.current)
    outlineLook.strength.value = amount.current
    // Keep animating under frameloop="demand" while easing.
    if (Math.abs(target - amount.current) > 0.005) state.invalidate()
  })

  return (
    <group ref={self} visible={false}>
      {shape && (
        <>
          {/* Where the piece is, in the stencil only — however much is hidden. */}
          <mesh geometry={shape} renderOrder={100} raycast={ignoreRaycast} onUpdate={setOwnLayer}>
            <meshBasicMaterial
              colorWrite={false}
              depthWrite={false}
              depthTest={false}
              transparent
              stencilWrite
              stencilRef={STENCIL_REFERENCE}
              stencilFunc={AlwaysStencilFunc}
              stencilZPass={IncrementStencilOp}
            />
          </mesh>
          <instancedMesh
            args={[shape, material, DIRECTIONS]}
            renderOrder={101}
            frustumCulled={false}
            raycast={ignoreRaycast}
            onUpdate={setOwnLayer}
          />
        </>
      )}
    </group>
  )
}

/** On the outlines' layer (see outlineLayer.ts). */
const setOwnLayer = (part: Object3D) => part.layers.set(OUTLINE_LAYER)

/** Never hit: it's how a piece shows it's pointed at, not part of it. */
const ignoreRaycast = () => {}

/**
 * The model's parts merged into one shape (positions only), in its own space:
 * the originals, merged away by baking (and hidden, groups and all) or not,
 * but not the baked meshes they're merged into (see BAKED_OUTPUT) — nor the
 * outline itself.
 */
const composeOutlineShape = (model: Object3D, outline: Object3D): BufferGeometry | null => {
  const parts: BufferGeometry[] = []

  const collect = (object: Object3D) => {
    if (object === outline || object.userData.isBakedOutput) return

    const isMerged = object.userData.isBakedOriginal || object.userData.isMergedGroup
    if (!object.visible && !isMerged) return

    if (object instanceof Mesh) {
      const source = object.geometry as BufferGeometry
      const part = new BufferGeometry()
      const flat = source.index ? source.toNonIndexed() : source
      part.setAttribute("position", flat.getAttribute("position").clone())
      part.applyMatrix4(getMatrixWithin(object, model))
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
