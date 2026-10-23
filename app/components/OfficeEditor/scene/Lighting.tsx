import { useLayoutEffect, useRef } from "react"
import * as THREE from "three"
import { ACCENT } from "../palette"
import type { DayProfile } from "../daylight"
import { useSurfaces } from "../sceneTheme"
import { FOG_SHIFT } from "./viewCentre"

interface Props {
  profile: DayProfile
  /** The office's centre on the ground (x, z): where the sun aims. */
  centre?: [number, number]
}

/**
 * Scene lighting driven by the time of day: a sun key that rises, warms and sets,
 * pastel bounce that dims into night, coloured background & fog, plus a faint
 * neon accent rim (the hint of outrun). Built-in PCF soft shadows (NOT drei
 * <SoftShadows>, whose PCSS shader patch fails on r0.185).
 */
export const Lighting = ({ profile: p, centre = [0, 0] }: Props) => {
  // Dark theme swaps the sky for the app background; lighting is unchanged.
  const bg = useSurfaces().background
  // The sun (and its shadow area, ±18 m) sits over the office, wherever on the
  // endless ground it's built: light and target move together.
  const sun = useRef<THREE.DirectionalLight>(null)
  const [cx, cz] = centre
  useLayoutEffect(() => {
    const light = sun.current
    if (!light) return
    light.target.position.set(cx, 0, cz)
    light.target.updateMatrixWorld()
  }, [cx, cz])
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
        shadow-mapSize={[2048, 2048]}
        shadow-radius={2}
        shadow-bias={-0.0006}
        shadow-normalBias={0.001}
      >
        <orthographicCamera attach="shadow-camera" args={[-18, 18, 18, -18, 0.1, 50]} />
      </directionalLight>
      {/* Cool fill from the opposite side (dims at night) */}
      <directionalLight position={[-8, 6, -6]} intensity={p.fillIntensity} color="#aebfe0" />
      {/* Hint of outrun: a faint neon accent rim */}
      <directionalLight position={[-5, 3, 8]} intensity={0.22} color={ACCENT} />
    </>
  )
}
