import { useContext, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  Color,
  Object3D,
  ShaderMaterial,
  Vector3,
  type InstancedMesh,
} from "three"
import { useEditorStore } from "../store"
import { DaylightContext } from "../daylight"
import { ACCENT } from "../palette"
import type { SceneObject } from "../types"
import type { PieceState } from "../module"
import { getRenderer } from "../catalog/rendering"
import { useLampsOn } from "./ShaderWarmup"

const UP = new Vector3(0, 1, 0)
const dummy = new Object3D()
const point = new Vector3()

/**
 * A soft glow that always faces the camera: no full-screen bloom pass, just a
 * small quad per light, added on top (walls still hide it).
 */
const createHaloMaterial = (color: string) =>
  new ShaderMaterial({
    uniforms: { color: { value: new Color(color) }, strength: { value: 0 }, size: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float size;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 centre = viewMatrix * modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        centre.xy += position.xy * size;
        gl_Position = projectionMatrix * centre;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float strength;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.4) * strength;
        if (a < 0.003) discard;
        gl_FragColor = vec4(color, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })

interface Props {
  /** Desks in view mode: whether someone sits there on the shown day (lit screen). */
  /** The modules' view of each piece: a free desk's lamp is off. */
  pieceStates: ReadonlyMap<string, PieceState> | null
}

/**
 * Glows that bring back the bloom feel without its cost: on the screens of
 * desks in use (faint by day, stronger after dark) and on every lamp's bulb
 * once the lamps are on. Two instanced draw calls.
 */
export const Halos = ({ pieceStates }: Props) => {
  const objects = useEditorStore((state) => state.objects)
  const nightness = useContext(DaylightContext)
  const isLampOn = useLampsOn()
  const invalidate = useThree((state) => state.invalidate)

  const screens = useMemo(
    () =>
      objects.flatMap((object) =>
        // A screen glows while someone's there (or nobody says otherwise).
        pieceStates?.get(object.id)?.isOccupied === false ? [] : glowsOf(object, "screen")
      ),
    [objects, pieceStates]
  )
  const bulbs = useMemo(() => objects.flatMap((object) => glowsOf(object, "bulb")), [objects])

  return (
    <>
      <HaloSet
        points={screens}
        color={ACCENT}
        size={0.55}
        strength={0.16 + nightness * 0.4}
        invalidate={invalidate}
      />
      {isLampOn && (
        <HaloSet
          points={bulbs}
          color="#ffd9a0"
          size={1.1}
          strength={nightness * 0.75}
          invalidate={invalidate}
        />
      )}
    </>
  )
}

const at = (object: SceneObject) => new Vector3(object.x, 0, object.z)

/** A piece's glows of one kind, placed in the world (see ItemRenderer.glows). */
const glowsOf = (object: SceneObject, kind: "screen" | "bulb") =>
  (getRenderer(object.type).glows ?? [])
    .filter((glow) => glow.kind === kind)
    .map((glow) =>
      point
        .set(...glow.position)
        .applyAxisAngle(UP, object.rotation)
        .add(at(object))
        .clone()
    )

/** One kind of halo, at every point: an instanced quad. */
const HaloSet = ({
  points,
  color,
  size,
  strength,
  invalidate,
}: {
  points: Vector3[]
  color: string
  size: number
  strength: number
  invalidate: () => void
}) => {
  const ref = useRef<InstancedMesh>(null)
  const material = useMemo(() => createHaloMaterial(color), [color])
  useLayoutEffect(() => () => material.dispose(), [material])
  material.uniforms.size.value = size
  material.uniforms.strength.value = strength

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return

    points.forEach((position, i) => {
      dummy.position.copy(position)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = points.length
    mesh.instanceMatrix.needsUpdate = true
    // The quads are spread out by the shader: give culling a generous sphere.
    mesh.computeBoundingSphere()
    if (mesh.boundingSphere) mesh.boundingSphere.radius += size

    invalidate()
  }, [points, size, invalidate])

  if (points.length === 0) return null

  return (
    <instancedMesh
      key={points.length}
      ref={ref}
      args={[undefined, material, points.length]}
      raycast={() => null}
      renderOrder={2}
    >
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  )
}
