import { Html } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo } from "react"
import { Color, DataTexture, NearestFilter, RedFormat, ShaderMaterial, Vector2 } from "three"
import { useEditorStore } from "../store"
import { ZONE_CELL, ZONE_RADIUS, composeZoneAreas } from "../zones"

/** Just above the interior floor's tint (0.006), below rugs and highlights. */
const Y = 0.009
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
const VERTEX = /* glsl */ `
  varying vec2 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const FRAGMENT = /* glsl */ `
  uniform sampler2D uMask;
  uniform vec2 uSize;
  uniform vec2 uOrigin;
  uniform float uCell;
  uniform vec3 uColor;
  uniform float uFill;
  uniform float uShade;
  uniform float uLine;
  varying vec2 vWorld;

  float filled(vec2 c) {
    if (c.x < 0.0 || c.y < 0.0 || c.x >= uSize.x || c.y >= uSize.y) return 0.0;
    return step(0.5, texture2D(uMask, (c + 0.5) / uSize).r);
  }

  void main() {
    const float R = ${ZONE_RADIUS.toFixed(2)}; // corner radius, in squares
    vec2 p = (vWorld - uOrigin) / uCell;
    vec2 cell = floor(p);
    vec2 f = p - cell;
    // This quarter's corner: which way it faces, and how far the point is from
    // the two sides meeting there.
    vec2 dir = vec2(f.x < 0.5 ? -1.0 : 1.0, f.y < 0.5 ? -1.0 : 1.0);
    vec2 t = vec2(dir.x > 0.0 ? 1.0 - f.x : f.x, dir.y > 0.0 ? 1.0 - f.y : f.y);
    float self = filled(cell);
    float side = filled(cell + vec2(dir.x, 0.0));
    float ahead = filled(cell + vec2(0.0, dir.y));
    float across = filled(cell + dir);

    // Signed distance to the edge, in squares: positive inside the zone.
    float d;
    if (self > 0.5) {
      if (side < 0.5 && ahead < 0.5) {
        // An outer corner: rounded off.
        d = t.x < R && t.y < R ? R - length(vec2(R) - t) : min(t.x, t.y);
      } else if (side < 0.5) {
        // An edge — but where it runs into an inner corner (the square across
        // is the zone's too), the curve in the empty square takes over from it.
        d = across > 0.5 && t.y < R ? length(vec2(t.x + R, t.y - R)) - R : t.x;
      } else if (ahead < 0.5) {
        d = across > 0.5 && t.x < R ? length(vec2(t.x - R, t.y + R)) - R : t.y;
      } else {
        // Inside — near an inner corner's curve when the square across is empty.
        d = across < 0.5 ? length(t + vec2(R)) - R : 1e3;
      }
    } else if (side > 0.5 && ahead > 0.5 && t.x < R && t.y < R) {
      d = length(vec2(R) - t) - R; // an inner corner's curve
    } else {
      discard;
    }

    d -= ${INSET};
    float w = fwidth(d);
    float inside = smoothstep(-w, w, d);
    float line = inside * (1.0 - smoothstep(${LINE_WIDTH} - w, ${LINE_WIDTH} + w, d));
    float alpha = inside * uFill + line * (uLine - uFill);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(uColor * (1.0 - uShade), alpha);
    #include <colorspace_fragment>
  }
`

/**
 * Each zone's part of the floor — under and round its desks — faintly tinted
 * in its colour with a fine line and rounded corners, its name in the middle.
 */
export const ZoneFloor = ({ isEditing, isDark }: { isEditing: boolean; isDark: boolean }) => {
  const objects = useEditorStore((s) => s.objects)
  const areas = useMemo(
    () =>
      composeZoneAreas(objects).map(({ zone, cells, label }) => {
        // One square of room all round, for the inner corners' curves.
        const minI = Math.min(...cells.map(([i]) => i)) - 1
        const minJ = Math.min(...cells.map(([, j]) => j)) - 1
        const cols = Math.max(...cells.map(([i]) => i)) - minI + 2
        const rows = Math.max(...cells.map(([, j]) => j)) - minJ + 2
        const mask = new Uint8Array(cols * rows)
        for (const [i, j] of cells) mask[(j - minJ) * cols + (i - minI)] = 255
        const texture = new DataTexture(mask, cols, rows, RedFormat)
        texture.magFilter = NearestFilter
        texture.minFilter = NearestFilter
        texture.unpackAlignment = 1
        texture.needsUpdate = true
        const material = new ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: {
            uMask: { value: texture },
            uSize: { value: new Vector2(cols, rows) },
            uOrigin: { value: new Vector2(minI * ZONE_CELL, minJ * ZONE_CELL) },
            uCell: { value: ZONE_CELL },
            uColor: { value: new Color(zone.color) },
            uFill: { value: 0 },
            uShade: { value: 0 },
            uLine: { value: 0 },
          },
          transparent: true,
          depthWrite: false,
        })
        return {
          zone,
          texture,
          material,
          centre: [(minI + cols / 2) * ZONE_CELL, (minJ + rows / 2) * ZONE_CELL] as const,
          size: [cols * ZONE_CELL, rows * ZONE_CELL] as const,
          label: [label.x, label.z] as const,
        }
      }),
    [objects]
  )
  // Strength follows mode and theme without rebuilding the zones.
  const strength = STRENGTH[isEditing ? "edit" : "view"][isDark ? "dark" : "light"]
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    for (const { material } of areas) {
      material.uniforms.uFill.value = strength.fill
      material.uniforms.uShade.value = strength.shade
      material.uniforms.uLine.value = strength.line
    }
    invalidate()
  }, [areas, strength, invalidate])
  useEffect(
    () => () =>
      areas.forEach((a) => {
        a.texture.dispose()
        a.material.dispose()
      }),
    [areas]
  )

  return (
    <>
      {areas.map(({ zone, material, centre, size, label }) => (
        <group key={zone.name}>
          <mesh
            position={[centre[0], Y, centre[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={material}
            renderOrder={1}
          >
            <planeGeometry args={[size[0], size[1]]} />
          </mesh>
          <Html
            position={[label[0], Y, label[1]]}
            center
            zIndexRange={[5, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-overlay/85 px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-sm">
              <span className="size-2 rounded-full" style={{ background: zone.color }} />
              {zone.name}
            </span>
          </Html>
        </group>
      ))}
    </>
  )
}
