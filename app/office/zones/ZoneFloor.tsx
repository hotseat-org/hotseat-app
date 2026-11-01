import { Html } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo } from "react"
import { Color, DataTexture, NearestFilter, RedFormat, Vector2 } from "three"
import {
  Fn,
  If,
  float,
  floor,
  fwidth,
  length,
  min,
  positionWorld,
  select,
  smoothstep,
  step,
  texture,
  uniform,
  vec2,
} from "three/tsl"
import { MeshBasicNodeMaterial, type Node } from "three/webgpu"
import { useOfficeStore } from "../store"
import { ZONE_CELL, ZONE_RADIUS, composeZoneAreas } from "./zones"

/** Just above the interior floor's tint (0.006), below rugs and highlights. */
const HEIGHT = 0.009
/**
 * Fill and line strength: faint while viewing, clearer while editing (zones
 * are being laid out). The light floor in daylight washes a pale tint out, so
 * there the colour goes deeper (`shade`: how far towards black) and stronger.
 */
const STRENGTH = {
  view: {
    dark: { fill: 0.07, line: 0.32, shade: 0 },
    light: { fill: 0.22, line: 0.9, shade: 0.35 },
  },
  edit: {
    dark: { fill: 0.13, line: 0.5, shade: 0 },
    light: { fill: 0.32, line: 1, shade: 0.4 },
  },
}
/** Drawn this far (in zone squares) inside its edge: zones that meet keep a gap. */
const INSET = 0.14
/** Line width, in zone squares. */
const LINE_WIDTH = 0.07

/**
 * The zone's squares (a mask texture, one texel each) drawn with rounded
 * corners: in each quarter of a square, the neighbours either side and across
 * the corner decide whether that corner is an outer one (rounded off) or an
 * inner one (filled in with a curve) — so any shape of squares gets soft
 * corners, at every size, with a thin line round the edge.
 */
/** Outside the zone: the edge distance that hides a pixel. */
const OUTSIDE = -1e3

const createZoneMaterial = ({
  mask,
  size,
  origin,
  color,
}: {
  mask: DataTexture
  size: Vector2
  origin: Vector2
  color: string
}) => {
  const maskSize = vec2(size.x, size.y)
  const fill = uniform(0)
  const shade = uniform(0)
  const line = uniform(0)
  const isFilled = (cell: Node<"vec2">) => {
    const isOff = cell.x
      .lessThan(0)
      .or(cell.y.lessThan(0))
      .or(cell.x.greaterThanEqual(size.x))
      .or(cell.y.greaterThanEqual(size.y))

    return select(isOff, float(0), step(0.5, texture(mask, cell.add(0.5).div(maskSize)).r))
  }

  // Signed distance to the edge, in squares: positive inside the zone.
  const getEdgeDistance = Fn(() => {
    const radius = ZONE_RADIUS
    const spot = positionWorld.xz.sub(vec2(origin.x, origin.y)).div(ZONE_CELL)
    const cell = floor(spot)
    const within = spot.sub(cell)
    // This quarter's corner: which way it faces, and how far the point is
    // from the two sides meeting there.
    const facing = vec2(
      select(within.x.lessThan(0.5), float(-1), float(1)),
      select(within.y.lessThan(0.5), float(-1), float(1))
    )
    const toSide = vec2(
      select(facing.x.greaterThan(0), float(1).sub(within.x), within.x),
      select(facing.y.greaterThan(0), float(1).sub(within.y), within.y)
    )
    const isSelf = isFilled(cell).greaterThan(0.5)
    const isSide = isFilled(cell.add(vec2(facing.x, 0))).greaterThan(0.5)
    const isAhead = isFilled(cell.add(vec2(0, facing.y))).greaterThan(0.5)
    const isAcross = isFilled(cell.add(facing)).greaterThan(0.5)
    const isNearCorner = toSide.x.lessThan(radius).and(toSide.y.lessThan(radius))
    const distance = float(OUTSIDE).toVar()

    If(isSelf.and(isSide.not()).and(isAhead.not()), () => {
      // An outer corner: rounded off.
      distance.assign(
        select(
          isNearCorner,
          float(radius).sub(length(vec2(radius).sub(toSide))),
          min(toSide.x, toSide.y)
        )
      )
    })
      .ElseIf(isSelf.and(isSide.not()), () => {
        // An edge — but where it runs into an inner corner (the square across
        // is the zone's too), the curve in the empty square takes over from it.
        const curve = length(vec2(toSide.x.add(radius), toSide.y.sub(radius))).sub(radius)
        distance.assign(select(isAcross.and(toSide.y.lessThan(radius)), curve, toSide.x))
      })
      .ElseIf(isSelf.and(isAhead.not()), () => {
        const curve = length(vec2(toSide.x.sub(radius), toSide.y.add(radius))).sub(radius)
        distance.assign(select(isAcross.and(toSide.x.lessThan(radius)), curve, toSide.y))
      })
      .ElseIf(isSelf, () => {
        // Inside — near an inner corner's curve when the square across is empty.
        distance.assign(select(isAcross, float(1e3), length(toSide.add(radius)).sub(radius)))
      })
      .ElseIf(isSide.and(isAhead).and(isNearCorner), () => {
        // An inner corner's curve.
        distance.assign(length(vec2(radius).sub(toSide)).sub(radius))
      })

    return distance
  })

  const edge = getEdgeDistance().sub(INSET)
  const smoothing = fwidth(edge)
  const inside = smoothstep(smoothing.negate(), smoothing, edge)
  const onLine = inside.mul(
    float(1).sub(smoothstep(smoothing.negate().add(LINE_WIDTH), smoothing.add(LINE_WIDTH), edge))
  )
  const alpha = inside.mul(fill).add(onLine.mul(line.sub(fill)))

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  material.colorNode = uniform(new Color(color)).mul(float(1).sub(shade))
  material.opacityNode = alpha
  material.maskNode = alpha.greaterThanEqual(0.002)

  return { material, fill, shade, line }
}

/**
 * Each zone's part of the floor — under and round its desks — faintly tinted
 * in its colour with a fine line and rounded corners, its name in the middle.
 */
export const ZoneFloor = ({ isEditing, isDark }: { isEditing: boolean; isDark: boolean }) => {
  const objects = useOfficeStore((state) => state.objects)
  const areas = useMemo(
    () =>
      composeZoneAreas(objects).map(({ zone, cells, label }) => {
        // One square of room all round, for the inner corners' curves.
        const minI = Math.min(...cells.map(([i]) => i)) - 1
        const minJ = Math.min(...cells.map(([, j]) => j)) - 1
        const columns = Math.max(...cells.map(([i]) => i)) - minI + 2
        const rows = Math.max(...cells.map(([, j]) => j)) - minJ + 2
        const mask = new Uint8Array(columns * rows)
        for (const [i, j] of cells) mask[(j - minJ) * columns + (i - minI)] = 255
        const texture = new DataTexture(mask, columns, rows, RedFormat)
        texture.magFilter = NearestFilter
        texture.minFilter = NearestFilter
        texture.unpackAlignment = 1
        texture.needsUpdate = true
        const look = createZoneMaterial({
          mask: texture,
          size: new Vector2(columns, rows),
          origin: new Vector2(minI * ZONE_CELL, minJ * ZONE_CELL),
          color: zone.color,
        })

        return {
          zone,
          texture,
          look,
          centre: [(minI + columns / 2) * ZONE_CELL, (minJ + rows / 2) * ZONE_CELL] as const,
          size: [columns * ZONE_CELL, rows * ZONE_CELL] as const,
          label: [label.x, label.z] as const,
        }
      }),
    [objects]
  )
  // Strength follows mode and theme without rebuilding the zones.
  const strength = STRENGTH[isEditing ? "edit" : "view"][isDark ? "dark" : "light"]
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    for (const { look } of areas) {
      look.fill.value = strength.fill
      look.shade.value = strength.shade
      look.line.value = strength.line
    }
    invalidate()
  }, [areas, strength, invalidate])
  useEffect(
    () => () =>
      areas.forEach((area) => {
        area.texture.dispose()
        area.look.material.dispose()
      }),
    [areas]
  )

  return (
    <>
      {areas.map(({ zone, look, centre, size, label }) => (
        <group key={zone.name}>
          <mesh
            position={[centre[0], HEIGHT, centre[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={look.material}
            renderOrder={1}
          >
            <planeGeometry args={[size[0], size[1]]} />
          </mesh>
          <Html
            position={[label[0], HEIGHT, label[1]]}
            center
            zIndexRange={[5, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-overlay px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm">
              <span className="size-2 rounded-full" style={{ background: zone.color }} />
              {zone.name}
            </span>
          </Html>
        </group>
      ))}
    </>
  )
}
