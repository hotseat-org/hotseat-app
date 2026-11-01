import { useThree } from "@react-three/fiber"
import { useLayoutEffect, useRef, useState } from "react"
import * as THREE from "three"
import { ACCENT } from "../palette"
import { useSurfaces } from "../scene/sceneTheme"
import { FOG_SHIFT } from "../camera/viewCentre"
import { getMaxTextureSize } from "../scene/createRenderer"
import type { DayProfile } from "./daylight"
import { cacheShadow, markShadowsDirty } from "./shadows"

interface Props {
  profile: DayProfile
  /** The office's centre on the ground (x, z): where the sun aims. */
  centre?: [number, number]
  /** How far the office reaches from its centre (m): what the shadows cover. */
  reach?: number
  /** How far the floors below go down from the shown one (m): their shadows too. */
  depth?: number
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
const getShadowArea = (reach: number, depth: number, maxMapSize: number) => {
  // Lower down, the sun's square lands further off: room for that too.
  const half = THREE.MathUtils.clamp(
    reach + SHADOW_MARGIN + depth,
    MIN_SHADOW_HALF,
    MAX_SHADOW_HALF
  )
  const wanted = 2 ** Math.ceil(Math.log2((2 * half) / SHADOW_TEXEL))

  return { half, mapSize: THREE.MathUtils.clamp(wanted, 1024, maxMapSize) }
}

export const Lighting = ({ profile, centre = [0, 0], reach = 0, depth = 0 }: Props) => {
  // Dark theme swaps the sky for the app background; lighting is unchanged.
  const background = useSurfaces().background
  // The sun (and its shadow area) sits over the office, wherever on the endless
  // ground it's built: light and target move together.
  const sun = useRef<THREE.DirectionalLight>(null)
  // Its shadow map is cached (see shadows.ts).
  useLayoutEffect(() => cacheShadow(sun.current), [])
  const [centreX, centreZ] = centre
  useLayoutEffect(() => {
    const light = sun.current
    if (!light) return

    light.target.position.set(centreX, 0, centreZ)
    light.target.updateMatrixWorld()
  }, [centreX, centreZ])
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const maxMapSize = getMaxTextureSize(renderer) >= 16384 ? 4096 : 2048
  const { half, mapSize } = getShadowArea(reach, depth, maxMapSize)
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

    markShadowsDirty(invalidate)
  }, [half, mapSize, renderer, invalidate])

  // One sky colour and one fog, changed in place. A new fog (as `<fog args>`
  // makes on every change) has the renderer rebuild every material's shader.
  const [sky] = useState(() => new THREE.Color())
  const [fog] = useState(() => new THREE.Fog(0x000000))
  useLayoutEffect(() => {
    sky.set(background ?? profile.sky)
    fog.color.set(background ?? profile.fog)
    fog.near = profile.fogNear + FOG_SHIFT
    fog.far = profile.fogFar + FOG_SHIFT
    invalidate()
  }, [sky, fog, background, profile.sky, profile.fog, profile.fogNear, profile.fogFar, invalidate])

  return (
    <>
      <primitive object={sky} attach="background" />
      <primitive object={fog} attach="fog" />

      <ambientLight intensity={profile.ambientIntensity} color={profile.ambientColor} />
      <hemisphereLight
        color={profile.hemiSky}
        groundColor={profile.hemiGround}
        intensity={profile.hemiIntensity}
      />
      <directionalLight
        ref={sun}
        position={[
          profile.sunPosition[0] + centreX,
          profile.sunPosition[1],
          profile.sunPosition[2] + centreZ,
        ]}
        intensity={profile.sunIntensity}
        color={profile.sunColor}
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
      <directionalLight position={[-8, 6, -6]} intensity={profile.fillIntensity} color="#aebfe0" />
      {/* Hint of outrun: a faint neon accent rim */}
      <directionalLight position={[-5, 3, 8]} intensity={0.22} color={ACCENT} />
    </>
  )
}
