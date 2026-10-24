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

/** Contour line width, in device pixels. */
const LINE_WIDTH = 1

/**
 * Plain coloured lines that, while editing, give way to the build area (where
 * the grid shows, see buildArea.ts) and fade back in beyond it.
 *
 * Each segment is a thin screen-space strip (see segmentsGeometry), not a GL
 * line: its shader works out how much of each pixel the line covers, so the
 * edges are smooth on any GPU and browser, with or without multisampling.
 */
const lineMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      ...createBuildAreaUniforms(),
      minorColor: { value: new THREE.Color() },
      majorColor: { value: new THREE.Color() },
      isEditing: { value: false },
      /** The drawing buffer's size (device pixels). */
      resolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 other;
      attribute float side;
      attribute float isEnd;
      attribute float isMajor;
      varying float vMajor;
      uniform vec2 resolution;
      varying vec3 vWorld;
      varying float vEdge;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 clip = projectionMatrix * viewMatrix * world;
        vec4 otherClip = projectionMatrix * viewMatrix * modelMatrix * vec4(other, 1.0);
        // Both ends on screen (px), then out sideways by half the width plus a
        // pixel for the smoothed edge, and a half pixel past the end so
        // consecutive segments join without a gap.
        vec2 halfSize = 0.5 * resolution;
        vec2 here = clip.xy / clip.w * halfSize;
        vec2 there = otherClip.xy / otherClip.w * halfSize;
        // Start → end, whichever end this corner is at.
        vec2 along = (there - here) * (isEnd > 0.5 ? -1.0 : 1.0);
        along = dot(along, along) > 0.0 ? normalize(along) : vec2(1.0, 0.0);
        float outward = isEnd > 0.5 ? 0.5 : -0.5;
        float reach = ${LINE_WIDTH.toFixed(1)} * 0.5 + 1.0;
        vec2 offset = vec2(-along.y, along.x) * side * reach + along * outward;
        clip.xy += offset / halfSize * clip.w;
        vEdge = side * reach;
        vMajor = isMajor;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 minorColor;
      uniform vec3 majorColor;
      uniform bool isEditing;
      varying vec3 vWorld;
      varying float vEdge;
      varying float vMajor;
      ${BUILD_AREA_GLSL}
      void main() {
        // How much of this pixel the line covers (px from its centre line).
        float coverage = clamp(${LINE_WIDTH.toFixed(1)} * 0.5 + 0.5 - abs(vEdge), 0.0, 1.0);
        float a = coverage * (isEditing ? 1.0 - buildArea(vWorld.xz) : 1.0);
        if (a <= 0.01) discard;
        gl_FragColor = vec4(vMajor > 0.5 ? majorColor : minorColor, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
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

/**
 * Minor and major segments (x0, z0, x1, z1 …) as one geometry (one draw call
 * per tile; each vertex knows which it is, for its colour), drawn as strips of two triangles: each corner knows
 * its own end, the other end, which end it is and which side it's on; the line shader spreads
 * them a fixed number of pixels apart on screen.
 */
const segmentsGeometry = (minor: Float32Array, major: Float32Array) => {
  const minorCount = minor.length / 4
  const count = minorCount + major.length / 4
  const positions = new Float32Array(count * 12)
  const others = new Float32Array(count * 12)
  const sides = new Float32Array(count * 4)
  const ends = new Float32Array(count * 4)
  const majors = new Float32Array(count * 4)
  const indices = new Uint32Array(count * 6)
  for (let i = 0; i < count; i++) {
    const isMajor = i >= minorCount
    const j = isMajor ? i - minorCount : i
    const [x0, z0, x1, z1] = (isMajor ? major : minor).subarray(j * 4, j * 4 + 4)
    // Corners: start left, start right, end left, end right.
    const corners = [
      [x0, z0, x1, z1, 1, 0],
      [x0, z0, x1, z1, -1, 0],
      [x1, z1, x0, z0, 1, 1],
      [x1, z1, x0, z0, -1, 1],
    ]
    corners.forEach(([x, z, ox, oz, side, isEnd], k) => {
      const v = i * 4 + k
      positions.set([x, LINE_Y, z], v * 3)
      others.set([ox, LINE_Y, oz], v * 3)
      sides[v] = side
      ends[v] = isEnd
      majors[v] = isMajor ? 1 : 0
    })
    const v = i * 4
    indices.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("other", new THREE.BufferAttribute(others, 3))
  geometry.setAttribute("side", new THREE.BufferAttribute(sides, 1))
  geometry.setAttribute("isEnd", new THREE.BufferAttribute(ends, 1))
  geometry.setAttribute("isMajor", new THREE.BufferAttribute(majors, 1))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
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
  lines: THREE.BufferGeometry
  stars: THREE.BufferGeometry
}
const toGeometry = (t: ContourTile): TileGeometry => ({
  lines: segmentsGeometry(t.minor, t.major),
  stars: starsGeometry(t.stars),
})
const disposeGeometry = (g: TileGeometry) => {
  g.lines.dispose()
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
  const linesMaterial = useMemo(lineMaterial, [])
  const starsMaterial = useMemo(starMaterial, [])
  const pixelRatio = useThree((s) => s.viewport.dpr)
  const size = useThree((s) => s.size)
  const applyBuildArea = useBuildArea()
  for (const m of [linesMaterial, starsMaterial]) {
    m.uniforms.isEditing.value = isEditing
    applyBuildArea(m.uniforms)
  }
  linesMaterial.uniforms.resolution.value.set(size.width * pixelRatio, size.height * pixelRatio)
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
      linesMaterial.dispose()
      starsMaterial.dispose()
    },
    [linesMaterial, starsMaterial]
  )

  const plateau = useMemo(() => plateauGeometry(land.plateau), [land])
  useEffect(() => () => plateau.dispose(), [plateau])

  // Lines aren't lit: in a theme whose night gets dark, dim them with the dusk.
  const dim = surfaces.nightDepth > 0 ? Math.min(1, nightness * 0.85) : 0
  linesMaterial.uniforms.minorColor.value.set(surfaces.contour.minor).lerp(NIGHT, dim)
  linesMaterial.uniforms.majorColor.value.set(surfaces.contour.major).lerp(NIGHT, dim)
  // Stars come out once it's properly dark (none by day — not even drawn).
  const starAmount = THREE.MathUtils.smoothstep(nightness, 0.55, 0.95)
  starsMaterial.uniforms.amount.value = starAmount
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
          <mesh geometry={t.lines} material={linesMaterial} raycast={() => null} />
          <points
            geometry={t.stars}
            material={starsMaterial}
            visible={starAmount > 0}
            raycast={() => null}
          />
        </group>
      ))}
    </group>
  )
}
