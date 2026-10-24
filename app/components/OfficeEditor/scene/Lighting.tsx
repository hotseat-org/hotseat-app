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

/**
 * The sun's shadow square, fitted to the office: half its size, and a map
 * resolution that keeps texels about as fine as 2048 px over ±18 m (~1.8 cm).
 * Small offices need only 1024 px (a quarter of the memory and fill); big ones
 * are covered whole instead of clipped, slightly softer.
 */
const getShadowArea = (reach: number) => {
  const half = Math.min(MAX_SHADOW_HALF, Math.max(MIN_SHADOW_HALF, reach + SHADOW_MARGIN))
  return { half, mapSize: half <= 9 ? 1024 : 2048 }
}

/**
 * Scene lighting driven by the time of day: a sun key that rises, warms and sets,
 * pastel bounce that dims into night, coloured background & fog, plus a faint
 * neon accent rim (the hint of outrun). Built-in PCF soft shadows (NOT drei
 * <SoftShadows>, whose PCSS shader patch fails on r0.185).
 */
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
  const { half, mapSize } = getShadowArea(reach)
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
        shadow-radius={2}
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
