import { ACCENT } from "../palette"
import type { DayProfile } from "../daylight"
import { useSurfaces } from "../sceneTheme"

interface Props {
  profile: DayProfile
}

/**
 * Scene lighting driven by the time of day: a sun key that rises, warms and sets,
 * pastel bounce that dims into night, coloured background & fog, plus a faint
 * neon accent rim (the hint of outrun). Built-in PCF soft shadows (NOT drei
 * <SoftShadows>, whose PCSS shader patch fails on r0.185).
 */
export const Lighting = ({ profile: p }: Props) => {
  // Dark theme swaps the sky for the app background; lighting is unchanged.
  const bg = useSurfaces().background
  return (
    <>
      <color attach="background" args={[bg ?? p.sky]} />
      <fog attach="fog" args={[bg ?? p.fog, p.fogNear, p.fogFar]} />

      <ambientLight intensity={p.ambientIntensity} color={p.ambientColor} />
      <hemisphereLight color={p.hemiSky} groundColor={p.hemiGround} intensity={p.hemiIntensity} />
      <directionalLight
        position={p.sunPosition}
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
