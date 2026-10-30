import { createContext } from "react"
import { clamp, lerp } from "../math"

/** A full scene-lighting profile derived from a time of day. */
export interface DayProfile {
  sky: string
  fog: string
  fogNear: number
  fogFar: number
  ambientColor: string
  ambientIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  fillIntensity: number
  sunColor: string
  sunIntensity: number
  sunPosition: [number, number, number]
  /** 0 = full daylight, 1 = deep night. Drives lamps + dims the IBL. */
  nightness: number
  /** Studio-environment (IBL) intensity for display mode. */
  envIntensity: number
}

// Hex colours mixed in linear light (as three's Color.lerp does) — kept
// three-free so the simple view's sky slider doesn't pull three.js in.
const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
const toSrgb = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055
/** "#rrggbb" or "rgb(r,g,b)" (mix's own output, fed back in) → linear RGB. */
const channels = (color: string) => {
  let rgb: number[]
  if (color.startsWith("#")) {
    const value = parseInt(color.slice(1), 16)
    rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  } else rgb = color.slice(4, -1).split(",").map(Number)

  return rgb.map((channel) => toLinear(channel / 255))
}
const mix = (first: string, second: string, amount: number) => {
  const firstChannels = channels(first)
  const secondChannels = channels(second)
  const [red, green, blue] = firstChannels.map((channel, i) =>
    Math.round(toSrgb(lerp(channel, secondChannels[i], clamp(amount, 0, 1))) * 255)
  )

  return `rgb(${red},${green},${blue})`
}

// Sky colour across 24h (linearly interpolated between stops).
const SKY: [number, string][] = [
  [0, "#0a0e18"],
  [6, "#39415d"],
  [7.5, "#d7a480"],
  [10, "#cfdae9"],
  [13, "#dfe4ec"],
  [17, "#e7c39a"],
  [18.5, "#d98f63"],
  [20, "#39365a"],
  [22, "#0c1120"],
  [24, "#0a0e18"],
]

const sampleSky = (hour: number) => {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [startTime, startColor] = SKY[i]
    const [endTime, endColor] = SKY[i + 1]
    if (hour >= startTime && hour <= endTime)
      return mix(startColor, endColor, (hour - startTime) / (endTime - startTime))
  }

  return SKY[0][1]
}

/**
 * Map a time of day (hours) to a lighting profile. The sun rises ~6:00, peaks at
 * noon and sets ~18:00; `nightness` ramps up around dusk so lamps switch on.
 */
export const daylight = (time: number, nightDepth = 0): DayProfile => {
  const hour = ((time % 24) + 24) % 24
  const theta = ((hour - 6) / 12) * Math.PI // 0 at 06:00, PI at 18:00
  const elevation = Math.sin(theta) // >0 above horizon (day), <0 below (night)
  const day = clamp((elevation + 0.12) / 0.4, 0, 1)
  const nightness = 1 - day

  const sunUp = Math.max(0, elevation)
  const warmth = 1 - clamp(elevation / 0.6, 0, 1) // orange near the horizon, white high up
  const sky = sampleSky(hour)

  // Night keeps the office readable: a cool "moonlight" key takes over from the
  // sun (mirrored across the sky, so it's up when the sun is down) and the
  // ambient/hemi fill only dims to ~70% — night reads through the blue tint,
  // dark sky and lamps switching on, not through darkness.
  const moonUp = Math.max(0, -elevation)
  // Night-end values: depth 0 = readable, 1 = deep, >1 keeps getting darker
  // (intensities extrapolate, floored at 0; the tint is deepest at 1).
  const darkness = Math.max(0, nightDepth)
  const dim = (readable: number, deep: number) => Math.max(0, lerp(readable, deep, darkness))
  const night = {
    ambient: dim(0.42, 0.24),
    hemi: dim(0.52, 0.3),
    moon: dim(1.1, 0.85),
    fill: dim(0.16, 0.1),
    env: dim(0.14, 0.08),
    ambientColor: mix("#9aa8cc", "#7384b0", darkness),
    hemiSky: mix("#7f93c4", "#5d70a3", darkness),
    hemiGround: mix("#2c344c", "#1c2236", darkness),
  }
  const moonIntensity = nightness * night.moon
  const keyIsMoon = moonIntensity > sunUp * 2.6
  const keyElev = keyIsMoon ? moonUp : elevation
  const keyTheta = keyIsMoon ? theta + Math.PI : theta

  return {
    sky,
    fog: sky,
    // Keep fog well beyond the framed office so daylight doesn't look hazy; pull
    // it in only slightly at night for a touch of depth.
    fogNear: lerp(70, 48, nightness),
    fogFar: lerp(180, 120, nightness),
    ambientColor: mix(night.ambientColor, "#fff3e6", day),
    ambientIntensity: lerp(night.ambient, 0.58, day),
    hemiSky: mix(night.hemiSky, "#fbf5e8", day),
    hemiGround: mix(night.hemiGround, "#8794a8", day),
    hemiIntensity: lerp(night.hemi, 0.72, day),
    fillIntensity: lerp(night.fill, 0.38, day),
    sunColor: keyIsMoon ? "#b9c8ff" : mix("#fff3e0", "#ff8a3d", warmth),
    sunIntensity: Math.max(sunUp * 2.6, moonIntensity),
    // Keep the key reasonably high so shadows never stretch across the floor.
    sunPosition: [Math.cos(keyTheta) * 12, Math.max(4, keyElev * 15), 5],
    nightness,
    envIntensity: lerp(night.env, 0.32, day),
  }
}

/** Current nightness (0..1), provided inside the scene so lamps can react. */
export const DaylightContext = createContext<number>(0)
