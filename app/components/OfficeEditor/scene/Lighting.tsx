import { useThree } from "@react-three/fiber"
import { useLayoutEffect, useRef } from "react"
import * as THREE from "three"
import { ACCENT } from "../palette"
import type { DayProfile } from "../daylight"
import { useSurfaces } from "../sceneTheme"
import { FOG_SHIFT } from "./viewCentre"
import { markShadowsDirty } from "./shadows"

interface Props {
  profile: DayProfile
  /** The office's centre on the ground (x, z): where the sun aims. */
  centre?: [number, number]
  /** How far the office reaches from its centre (m): what the shadows cover. */
  reach?: number
}

/** Room round the office for shadows thrown outward by a low sun (m). */
const SHADOW_MARGIN = 3
/** Shadow area half-size bounds (m): a lone desk to a big floor. */
const MIN_SHADOW_HALF = 6
const MAX_SHADOW_HALF = 30

/** Shadow texel size to aim for (m): crisp contact edges when zoomed in. */
const SHADOW_TEXEL = 0.012

/**
 * The sun's shadow square, fitted to the office: half its size, and a map
 * resolution for ~1.2 cm texels — up to 4096 px where the GPU has room (desktop
 * GPUs and Apple Silicon; 2048 elsewhere). Shadows are cached (redrawn only
 * when the layout or time changes), so a bigger map costs memory and a little
 * per-pixel lookup, not a redraw every frame.
 */
const getShadowArea = (reach: number, maxMapSize: number) => {
  const half = Math.min(MAX_SHADOW_HALF, Math.max(MIN_SHADOW_HALF, reach + SHADOW_MARGIN))
  const wanted = 2 ** Math.ceil(Math.log2((2 * half) / SHADOW_TEXEL))
  return { half, mapSize: Math.min(maxMapSize, Math.max(1024, wanted)) }
}

export const Lighting = ({ profile: p, centre = [0, 0], reach = 0 }: Props) => {
  // Dark theme swaps the sky for the app background; lighting is unchanged.
  const bg = useSurfaces().background
  // The sun (and its shadow area) sits over the office, wherever on the endless
  // ground it's built: light and target move together.
  const sun = useRef<THREE.DirectionalLight>(null)
  const [cx, cz] = centre
  useLayoutEffect(() => {
    const light = sun.current
    if (!light) return
    light.target.position.set(cx, 0, cz)
    light.target.updateMatrixWorld()
  }, [cx, cz])
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const maxMapSize = gl.capabilities.maxTextureSize >= 16384 ? 4096 : 2048
  const { half, mapSize } = getShadowArea(reach, maxMapSize)
  useLayoutEffect(() => {
    const light = sun.current
    if (!light) return
    const { camera, mapSize: size } = light.shadow
    camera.left = camera.bottom = -half
    camera.right = camera.top = half
    // The sun stands ~20 m from the office's centre; reach past its far side.
    camera.far = 30 + half
    camera.updateProjectionMatrix()
    if (size.x !== mapSize) {
      size.set(mapSize, mapSize)
      // A new size needs a new map; the renderer makes one on its next pass.
      light.shadow.map?.dispose()
      light.shadow.map = null
    }
    markShadowsDirty(gl, invalidate)
  }, [half, mapSize, gl, invalidate])
  return (
    <>
      <color attach="background" args={[bg ?? p.sky]} />
      <fog attach="fog" args={[bg ?? p.fog, p.fogNear + FOG_SHIFT, p.fogFar + FOG_SHIFT]} />

      <ambientLight intensity={p.ambientIntensity} color={p.ambientColor} />
      <hemisphereLight color={p.hemiSky} groundColor={p.hemiGround} intensity={p.hemiIntensity} />
      <directionalLight
        ref={sun}
        position={[p.sunPosition[0] + cx, p.sunPosition[1], p.sunPosition[2] + cz]}
        intensity={p.sunIntensity}
        color={p.sunColor}
        castShadow
        // Soft PCF edges: a few texels of penumbra (~3.5 cm).
        shadow-radius={3}
        shadow-bias={-0.0006}
        shadow-normalBias={0.001}
      >
        {/* Bounds and map size fitted to the office above. */}
        <orthographicCamera attach="shadow-camera" args={[-18, 18, 18, -18, 0.1, 50]} />
      </directionalLight>
      {/* Cool fill from the opposite side (dims at night) */}
      <directionalLight position={[-8, 6, -6]} intensity={p.fillIntensity} color="#aebfe0" />
      {/* Hint of outrun: a faint neon accent rim */}
      <directionalLight position={[-5, 3, 8]} intensity={0.22} color={ACCENT} />
    </>
  )
}
