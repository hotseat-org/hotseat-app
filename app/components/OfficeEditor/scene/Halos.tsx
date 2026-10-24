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
import { DESK } from "../objects/dimensions"
import { ACCENT } from "../palette"
import type { SceneObject } from "../types"
import { useLampsOn } from "./ShaderWarmup"

/** A desk's screen, in its own space (see objects/Desk.tsx), a hair in front. */
const SCREEN = new Vector3(0, DESK.height + 0.44, -DESK.depth / 2 + 0.2)
/** Where each kind of desk puts its Desk (see Workstation.tsx, Deskmate.tsx). */
const DESK_OFFSET = { desk: 0, workstation: -0.25, deskmate: -0.35 }
/** Where a lamp's glow sits: inside a pendant's bulb, inside a floor lamp's shade. */
const BULB_HEIGHT = { ceilingLight: 2.18, floorLamp: 1.55 }
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
  occupied: Map<string, boolean> | null
}

/**
 * Glows that bring back the bloom feel without its cost: on the screens of
 * desks in use (faint by day, stronger after dark) and on every lamp's bulb
 * once the lamps are on. Two instanced draw calls.
 */
export const Halos = ({ occupied }: Props) => {
  const objects = useEditorStore((s) => s.objects)
  const nightness = useContext(DaylightContext)
  const isLampOn = useLampsOn()
  const invalidate = useThree((s) => s.invalidate)

  const screens = useMemo(
    () =>
      objects
        .filter((o) => o.type in DESK_OFFSET && occupied?.get(o.id) !== false)
        .map((o) =>
          point
            .copy(SCREEN)
            .setZ(SCREEN.z + DESK_OFFSET[o.type as keyof typeof DESK_OFFSET])
            .applyAxisAngle(UP, o.rotation)
            .add(at(o))
            .clone()
        ),
    [objects, occupied]
  )
  const bulbs = useMemo(
    () =>
      objects
        .filter((o) => o.type === "ceilingLight" || o.type === "floorLamp")
        .map((o) => at(o).setY(BULB_HEIGHT[o.type as keyof typeof BULB_HEIGHT])),
    [objects]
  )

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

const at = (o: SceneObject) => new Vector3(o.x, 0, o.z)

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
    points.forEach((p, i) => {
      dummy.position.copy(p)
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
