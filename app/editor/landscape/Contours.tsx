import { useFrame, useThree } from "@react-three/fiber"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  dot,
  float,
  instancedBufferAttribute,
  length,
  max,
  modelWorldMatrix,
  normalize,
  positionLocal,
  positionWorld,
  pow,
  select,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl"
import { MeshBasicNodeMaterial, PointsNodeMaterial, type Node } from "three/webgpu"
import { DaylightContext } from "../lighting/daylight"
import { useSurfaces } from "../scene/sceneTheme"
import { useEditorStore } from "../store"
import type { SceneObject } from "../types"
import { createBuildArea, useBuildArea } from "../building/buildArea"
import { getViewCentre } from "../camera/viewCentre"
import { TILE, tilesCovering, useLandscape, type ContourTile } from "./terrain"

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

/** A point in clip space, from a point in the mesh's own space. */
const toClip = (point: Node<"vec3">) =>
  cameraProjectionMatrix.mul(cameraViewMatrix).mul(modelWorldMatrix).mul(vec4(point, 1))

/**
 * The land's look (TSL): shared by every tile — its colours, the build area
 * the lines and stars give way to while editing, and the stars' amount.
 * Lines: one material for every tile; stars: one per tile (each its own
 * instances), all reading these same values.
 */
const createLook = () => {
  const area = createBuildArea()
  const isEditing = uniform(0)
  const minorColor = uniform(new THREE.Color())
  const majorColor = uniform(new THREE.Color())
  /** The drawing buffer's size (device pixels). */
  const resolution = uniform(new THREE.Vector2(1, 1))
  const starAmount = uniform(0)
  /** Where it's seen: 1, or giving way to the build area while editing. */
  const getShown = () =>
    select(isEditing.greaterThan(0.5), float(1).sub(area.getArea(positionWorld.xz)), float(1))

  return {
    area,
    isEditing,
    minorColor,
    majorColor,
    resolution,
    starAmount,
    lines: createLinesMaterial({ minorColor, majorColor, resolution, shown: getShown() }),
    createStarsMaterial: (stars: StarInstances) =>
      createStarsMaterial(stars, { amount: starAmount, shown: getShown() }),
  }
}
type Look = ReturnType<typeof createLook>

/**
 * Plain coloured lines that, while editing, give way to the build area (where
 * the grid shows, see buildArea.ts) and fade back in beyond it.
 *
 * Each segment is a thin screen-space strip (see segmentsGeometry), not a GL
 * line: its shader works out how much of each pixel the line covers, so the
 * edges are smooth on any GPU and browser, with or without multisampling.
 */
const createLinesMaterial = ({
  minorColor,
  majorColor,
  resolution,
  shown,
}: {
  minorColor: Node<"color">
  majorColor: Node<"color">
  resolution: Node<"vec2">
  shown: Node<"float">
}) => {
  const isEnd = attribute<"float">("isEnd", "float").greaterThan(0.5)
  const side = attribute<"float">("side", "float")
  const clip = toClip(positionLocal)
  const otherClip = toClip(attribute<"vec3">("other", "vec3"))
  // Both ends on screen (px), then out sideways by half the width plus a pixel
  // for the smoothed edge, and a half pixel past the end so consecutive
  // segments join without a gap.
  const halfSize = resolution.mul(0.5)
  const here = clip.xy.div(clip.w).mul(halfSize)
  const there = otherClip.xy.div(otherClip.w).mul(halfSize)
  // Start → end, whichever end this corner is at.
  const towards = there.sub(here).mul(select(isEnd, float(-1), float(1)))
  const along = select(dot(towards, towards).greaterThan(0), normalize(towards), vec2(1, 0))
  const reach = LINE_WIDTH * 0.5 + 1
  const offset = vec2(along.y.negate(), along.x)
    .mul(side)
    .mul(reach)
    .add(along.mul(select(isEnd, float(0.5), float(-0.5))))
  // How far this corner is from the centre line (px): the edge's smoothing.
  const edge = varying(side.mul(reach))
  const isMajor = varying(attribute<"float">("isMajor", "float")).greaterThan(0.5)
  // How much of this pixel the line covers.
  const coverage = clamp(float(LINE_WIDTH * 0.5 + 0.5).sub(edge.abs()), 0, 1)
  const alpha = coverage.mul(shown)

  // No fog, as the ground under them: far off, they'd fade into a ground that doesn't.
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  })
  material.vertexNode = vec4(clip.xy.add(offset.div(halfSize).mul(clip.w)), clip.zw)
  material.colorNode = select(isMajor, majorColor, minorColor)
  material.opacityNode = alpha
  material.maskNode = alpha.greaterThan(0.01)

  return material
}

/** A tile's stars, one instance each: where it is, and how bright. */
interface StarInstances {
  positions: THREE.InstancedBufferAttribute
  brightness: THREE.InstancedBufferAttribute
  count: number
}

const STAR_COLOR = new THREE.Color("#f4f1ff")

/**
 * Stars at night: soft round dots, a few pixels across at any zoom, that
 * fade in with the dark (`amount`) and, like the lines, give way to the build
 * area. Drawn as instanced sprites (WebGPU's points are a pixel wide).
 */
const createStarsMaterial = (
  stars: StarInstances,
  { amount, shown }: { amount: Node<"float">; shown: Node<"float"> }
) => {
  const brightness = instancedBufferAttribute<"float">(stars.brightness, "float")
  // A soft dot: bright core, glowing edge.
  const fromCentre = length(uv().sub(0.5)).mul(2)
  const glow = pow(max(float(0), float(1).sub(fromCentre)), 2.2)
  const alpha = glow.mul(brightness).mul(amount).mul(shown)

  const material = new PointsNodeMaterial({ transparent: true, depthWrite: false, fog: false })
  material.positionNode = instancedBufferAttribute<"vec3">(stars.positions, "vec3")
  material.sizeNode = brightness.mul(3.5).add(2)
  material.colorNode = vec3(STAR_COLOR.r, STAR_COLOR.g, STAR_COLOR.b)
  material.opacityNode = alpha
  material.maskNode = alpha.greaterThan(0.01)

  return material
}

const getStarInstances = (stars: Float32Array): StarInstances => {
  const count = stars.length / 3
  const positions = new Float32Array(count * 3)
  const brightness = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = stars[i * 3]
    positions[i * 3 + 1] = STAR_Y
    positions[i * 3 + 2] = stars[i * 3 + 1]
    brightness[i] = stars[i * 3 + 2]
  }

  return {
    positions: new THREE.InstancedBufferAttribute(positions, 3),
    brightness: new THREE.InstancedBufferAttribute(brightness, 1),
    count,
  }
}

/**
 * Minor and major segments (fromX, fromZ, toX, toZ …) as one geometry (one draw call
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
    const [fromX, fromZ, toX, toZ] = (isMajor ? major : minor).subarray(j * 4, j * 4 + 4)
    // Corners: start left, start right, end left, end right.
    const corners = [
      [fromX, fromZ, toX, toZ, 1, 0],
      [fromX, fromZ, toX, toZ, -1, 0],
      [toX, toZ, fromX, fromZ, 1, 1],
      [toX, toZ, fromX, fromZ, -1, 1],
    ]
    corners.forEach(([x, z, offsetX, offsetZ, side, isEnd], cornerIndex) => {
      const vertex = i * 4 + cornerIndex
      positions.set([x, LINE_Y, z], vertex * 3)
      others.set([offsetX, LINE_Y, offsetZ], vertex * 3)
      sides[vertex] = side
      ends[vertex] = isEnd
      majors[vertex] = isMajor ? 1 : 0
    })
    const vertex = i * 4
    indices.set([vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2], i * 6)
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
  for (let i = 0, prevIndex = loop.length - 1; i < loop.length; prevIndex = i++) {
    const [currentX, currentZ] = loop[i]
    const [prevX, prevZ] = loop[prevIndex]
    if (
      currentZ > z !== prevZ > z &&
      x < ((prevX - currentX) * (z - currentZ)) / (prevZ - currentZ) + currentX
    )
      inside = !inside
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
  const outers = loops.filter(
    (inner) => !loops.some((outer) => outer !== inner && isInside(inner[0], outer))
  )
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

/** One tile's lines as geometry, and its stars, kept while it's in reach. */
type TileGeometry = {
  lines: THREE.BufferGeometry
  stars: PointsNodeMaterial
  starCount: number
}
const toGeometry = (tile: ContourTile, look: Look): TileGeometry => {
  const stars = getStarInstances(tile.stars)

  return {
    lines: segmentsGeometry(tile.minor, tile.major),
    stars: look.createStarsMaterial(stars),
    starCount: stars.count,
  }
}
const disposeGeometry = (geometry: TileGeometry) => {
  geometry.lines.dispose()
  geometry.stars.dispose()
}

const viewCentre = new THREE.Vector3()

/**
 * The endless contour map round the office (see terrain.ts): its plateau,
 * and the lines of the tiles round wherever the camera looks — the same land
 * as the 2D plan. While editing, the plateau is hidden and the lines give way
 * to the grid's area round the structure, fading back in beyond it.
 */
export const Contours = ({
  isEditing = false,
  pieces,
}: {
  isEditing?: boolean
  /** What the land is shaped round: the ground floor's pieces (unset: the shown floor's). */
  pieces?: SceneObject[]
}) => {
  const shown = useEditorStore((state) => state.objects)
  const objects = pieces ?? shown
  const surfaces = useSurfaces()
  const nightness = useContext(DaylightContext)
  const land = useLandscape(objects)

  // The tile under the view centre: re-chosen as the camera pans.
  const [centreTile, setCentreTile] = useState<[number, number]>([0, 0])
  const look = useMemo(createLook, [])
  const pixelRatio = useThree((state) => state.viewport.dpr)
  const size = useThree((state) => state.size)
  const applyBuildArea = useBuildArea()
  look.isEditing.value = isEditing ? 1 : 0
  applyBuildArea(look.area)
  look.resolution.value.set(size.width * pixelRatio, size.height * pixelRatio)
  useFrame(({ camera }) => {
    if (!getViewCentre(camera, viewCentre)) return

    const tileX = Math.floor(viewCentre.x / TILE)
    const tileZ = Math.floor(viewCentre.z / TILE)
    if (tileX !== centreTile[0] || tileZ !== centreTile[1]) setCentreTile([tileX, tileZ])
  })

  // Geometry per tile, cached while it's near; dropped (and freed) once far.
  const geometries = useRef(new Map<string, TileGeometry>())
  const cacheFor = useRef<unknown>(null)
  if (cacheFor.current !== land) {
    for (const geometry of geometries.current.values()) disposeGeometry(geometry)
    geometries.current.clear()
    cacheFor.current = land
  }

  const [cellsX, cellsZ] = centreTile
  const tiles = tilesCovering(
    { x: (cellsX - REACH) * TILE, z: (cellsZ - REACH) * TILE },
    { x: (cellsX + REACH) * TILE, z: (cellsZ + REACH) * TILE }
  ).map(([tileX, tileZ]) => {
    const key = `${tileX},${tileZ}`
    let geometry = geometries.current.get(key)
    if (!geometry) {
      geometry = toGeometry(land.tile(tileX, tileZ), look)
      geometries.current.set(key, geometry)
    }

    return { key, ...geometry }
  })
  // Free tiles that drifted out of reach.
  useEffect(() => {
    const keep = new Set(tiles.map((tile) => tile.key))
    for (const [key, geometry] of geometries.current)
      if (!keep.has(key)) {
        disposeGeometry(geometry)
        geometries.current.delete(key)
      }
  })
  useEffect(() => () => look.lines.dispose(), [look])

  const plateau = useMemo(() => plateauGeometry(land.plateau), [land])
  useEffect(() => () => plateau.dispose(), [plateau])

  // Lines aren't lit: in a theme whose night gets dark, dim them with the dusk.
  const dim = surfaces.nightDepth > 0 ? Math.min(1, nightness * 0.85) : 0
  look.minorColor.value.set(surfaces.contour.minor).lerp(NIGHT, dim)
  look.majorColor.value.set(surfaces.contour.major).lerp(NIGHT, dim)
  // Stars come out once it's properly dark (none by day — not even drawn).
  const starAmount = THREE.MathUtils.smoothstep(nightness, 0.55, 0.95)
  look.starAmount.value = starAmount

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
      {tiles.map((tile) => (
        <group key={tile.key}>
          <mesh geometry={tile.lines} material={look.lines} raycast={() => null} />
          <sprite
            material={tile.stars}
            count={tile.starCount}
            visible={starAmount > 0 && tile.starCount > 0}
            frustumCulled={false}
            raycast={() => null}
          />
        </group>
      ))}
    </group>
  )
}
