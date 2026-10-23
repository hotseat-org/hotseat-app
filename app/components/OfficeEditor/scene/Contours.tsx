import { useFrame, useThree } from "@react-three/fiber"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { TILE, tilesCovering, useLandscape, type ContourTile } from "../contours"
import { DaylightContext } from "../daylight"
import { useSurfaces } from "../sceneTheme"
import { useEditorStore } from "../store"
import { BUILD_AREA_GLSL, createBuildAreaUniforms, useBuildArea } from "./buildArea"
import { getViewCentre } from "./viewCentre"

/** Lines just above the ground and the plateau, below the office floor (0.006). */
const LINE_Y = 0.004
const PLATEAU_Y = 0.002
const STAR_Y = 0.005
/** Tiles drawn round the view centre, each way (enough for the widest zoom). */
const REACH = 3

/** Where unlit lines head at night, so they dim with the lit ground around them. */
const NIGHT = new THREE.Color("#2a2f3a")

/**
 * Plain coloured lines that, while editing, give way to the build area (where
 * the grid shows, see buildArea.ts) and fade back in beyond it.
 */
const lineMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      ...createBuildAreaUniforms(),
      color: { value: new THREE.Color() },
      isEditing: { value: false },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform bool isEditing;
      varying vec3 vWorld;
      ${BUILD_AREA_GLSL}
      void main() {
        float a = isEditing ? 1.0 - buildArea(vWorld.xz) : 1.0;
        if (a <= 0.01) discard;
        gl_FragColor = vec4(color, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  })

/**
 * Stars at night: soft round points, a few pixels across at any zoom, that
 * fade in with the dark (`amount`) and, like the lines, give way to the build area.
 */
const starMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      ...createBuildAreaUniforms(),
      color: { value: new THREE.Color("#f4f1ff") },
      amount: { value: 0 },
      pixelRatio: { value: 1 },
      isEditing: { value: false },
    },
    vertexShader: /* glsl */ `
      attribute float brightness;
      uniform float pixelRatio;
      varying vec3 vWorld;
      varying float vBrightness;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vBrightness = brightness;
        gl_PointSize = (2.0 + brightness * 3.5) * pixelRatio;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float amount;
      uniform bool isEditing;
      varying vec3 vWorld;
      varying float vBrightness;
      ${BUILD_AREA_GLSL}
      void main() {
        // A soft dot: bright core, glowing edge.
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float glow = pow(max(0.0, 1.0 - r), 2.2);
        float a = glow * vBrightness * amount;
        if (isEditing) a *= 1.0 - buildArea(vWorld.xz);
        if (a <= 0.01) discard;
        gl_FragColor = vec4(color, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  })

const starsGeometry = (stars: Float32Array) => {
  const count = stars.length / 3
  const positions = new Float32Array(count * 3)
  const brightness = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = stars[i * 3]
    positions[i * 3 + 1] = STAR_Y
    positions[i * 3 + 2] = stars[i * 3 + 1]
    brightness[i] = stars[i * 3 + 2]
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("brightness", new THREE.BufferAttribute(brightness, 1))
  return geometry
}

const segmentsGeometry = (segments: Float32Array) => {
  const positions = new Float32Array((segments.length / 4) * 6)
  for (let i = 0, j = 0; i < segments.length; i += 4, j += 6) {
    positions[j] = segments[i]
    positions[j + 1] = LINE_Y
    positions[j + 2] = segments[i + 1]
    positions[j + 3] = segments[i + 2]
    positions[j + 4] = LINE_Y
    positions[j + 5] = segments[i + 3]
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  return geometry
}

/** Is the point inside the closed loop (even-odd ray cast)? */
const isInside = ([x, z]: [number, number], loop: [number, number][]) => {
  let inside = false
  for (let i = 0, k = loop.length - 1; i < loop.length; k = i++) {
    const [xi, zi] = loop[i]
    const [xk, zk] = loop[k]
    if (zi > z !== zk > z && x < ((xk - xi) * (z - zi)) / (zk - zi) + xi) inside = !inside
  }
  return inside
}

/**
 * The plateau as flat geometry in the XZ plane: each outline that isn't inside
 * another is a piece; those inside one are its holes.
 */
const plateauGeometry = (loops: [number, number][][]) => {
  const toPath = (loop: [number, number][], path: THREE.Path) => {
    loop.forEach(([x, z], i) => (i ? path.lineTo(x, z) : path.moveTo(x, z)))
    path.closePath()
    return path
  }
  const shapes: THREE.Shape[] = []
  const outers = loops.filter((l) => !loops.some((o) => o !== l && isInside(l[0], o)))
  for (const outer of outers) {
    const shape = toPath(outer, new THREE.Shape()) as THREE.Shape
    for (const hole of loops)
      if (hole !== outer && isInside(hole[0], outer))
        shape.holes.push(toPath(hole, new THREE.Path()))
    shapes.push(shape)
  }
  const geometry = new THREE.ShapeGeometry(shapes)
  // Shapes are drawn in XY; lay them on the ground (y up, z towards the viewer).
  geometry.rotateX(Math.PI / 2)
  return geometry
}

/** One tile's lines as geometry, kept while it's in reach. */
type TileGeometry = {
  minor: THREE.BufferGeometry
  major: THREE.BufferGeometry
  stars: THREE.BufferGeometry
}
const toGeometry = (t: ContourTile): TileGeometry => ({
  minor: segmentsGeometry(t.minor),
  major: segmentsGeometry(t.major),
  stars: starsGeometry(t.stars),
})
const disposeGeometry = (g: TileGeometry) => {
  g.minor.dispose()
  g.major.dispose()
  g.stars.dispose()
}

const viewCentre = new THREE.Vector3()

/**
 * The endless contour map round the office (see contours.ts): its plateau,
 * and the lines of the tiles round wherever the camera looks — the same land
 * as the 2D plan. While editing, the plateau is hidden and the lines give way
 * to the grid's area round the structure, fading back in beyond it.
 */
export const Contours = ({ isEditing = false }: { isEditing?: boolean }) => {
  const objects = useEditorStore((s) => s.objects)
  const surfaces = useSurfaces()
  const nightness = useContext(DaylightContext)
  const land = useLandscape(objects)

  // The tile under the view centre: re-chosen as the camera pans.
  const [centreTile, setCentreTile] = useState<[number, number]>([0, 0])
  const minorMaterial = useMemo(lineMaterial, [])
  const majorMaterial = useMemo(lineMaterial, [])
  const starsMaterial = useMemo(starMaterial, [])
  const pixelRatio = useThree((s) => s.viewport.dpr)
  const applyBuildArea = useBuildArea()
  for (const m of [minorMaterial, majorMaterial, starsMaterial]) {
    m.uniforms.isEditing.value = isEditing
    applyBuildArea(m.uniforms)
  }
  useFrame(({ camera }) => {
    if (!getViewCentre(camera, viewCentre)) return
    const tx = Math.floor(viewCentre.x / TILE)
    const tz = Math.floor(viewCentre.z / TILE)
    if (tx !== centreTile[0] || tz !== centreTile[1]) setCentreTile([tx, tz])
  })

  // Geometry per tile, cached while it's near; dropped (and freed) once far.
  const geometries = useRef(new Map<string, TileGeometry>())
  const cacheFor = useRef<unknown>(null)
  if (cacheFor.current !== land) {
    for (const g of geometries.current.values()) disposeGeometry(g)
    geometries.current.clear()
    cacheFor.current = land
  }
  const [cx, cz] = centreTile
  const tiles = tilesCovering(
    (cx - REACH) * TILE,
    (cz - REACH) * TILE,
    (cx + REACH) * TILE,
    (cz + REACH) * TILE
  ).map(([tx, tz]) => {
    const key = `${tx},${tz}`
    let g = geometries.current.get(key)
    if (!g) {
      g = toGeometry(land.tile(tx, tz))
      geometries.current.set(key, g)
    }
    return { key, ...g }
  })
  // Free tiles that drifted out of reach.
  useEffect(() => {
    const keep = new Set(tiles.map((t) => t.key))
    for (const [key, g] of geometries.current)
      if (!keep.has(key)) {
        disposeGeometry(g)
        geometries.current.delete(key)
      }
  })
  useEffect(
    () => () => {
      minorMaterial.dispose()
      majorMaterial.dispose()
      starsMaterial.dispose()
    },
    [minorMaterial, majorMaterial, starsMaterial]
  )

  const plateau = useMemo(() => plateauGeometry(land.plateau), [land])
  useEffect(() => () => plateau.dispose(), [plateau])

  // Lines aren't lit: in a theme whose night gets dark, dim them with the dusk.
  const dim = surfaces.nightDepth > 0 ? Math.min(1, nightness * 0.85) : 0
  minorMaterial.uniforms.color.value.set(surfaces.contour.minor).lerp(NIGHT, dim)
  majorMaterial.uniforms.color.value.set(surfaces.contour.major).lerp(NIGHT, dim)
  // Stars come out once it's properly dark (none by day).
  starsMaterial.uniforms.amount.value = THREE.MathUtils.smoothstep(nightness, 0.55, 0.95)
  starsMaterial.uniforms.pixelRatio.value = pixelRatio

  return (
    <group>
      <mesh
        geometry={plateau}
        position-y={PLATEAU_Y}
        visible={!isEditing}
        receiveShadow
        raycast={() => null}
      >
        {/* Both sides: the rotated shape's normal points down (the shader
            flips it for the face we see, so it's lit like the ground). */}
        <meshStandardMaterial
          color={surfaces.contour.plateau3d}
          roughness={0.95}
          fog={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {tiles.map((t) => (
        <group key={t.key}>
          <lineSegments geometry={t.minor} material={minorMaterial} raycast={() => null} />
          <lineSegments geometry={t.major} material={majorMaterial} raycast={() => null} />
          <points geometry={t.stars} material={starsMaterial} raycast={() => null} />
        </group>
      ))}
    </group>
  )
}
