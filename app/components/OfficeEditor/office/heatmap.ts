import { msg } from "~/i18n/msg"

/**
 * The heatmap's single-hue scale (warm orange): how often a desk was in use,
 * 0–1. Light: pale peach → burnt orange. Dark: deep ember → bright amber, so
 * busy desks glow and quiet ones fade into the floor. Sequential: the steps
 * differ in lightness, so it reads without colour too.
 */
const LIGHT = ["#fde7c2", "#fcc97f", "#f9a64a", "#f08328", "#d9611a", "#b04512"]
const DARK = ["#5a3418", "#8a4415", "#c25a14", "#ea7420", "#ff8f2e", "#ffab4a"]

export const heatColor = (ratio: number, isDark: boolean) => {
  const ramp = isDark ? DARK : LIGHT
  const i = Math.round(Math.max(0, Math.min(1, ratio)) * (ramp.length - 1))
  return ramp[i]
}

/** CSS gradient of the scale (for legends). */
export const heatGradient = (isDark: boolean) =>
  `linear-gradient(90deg, ${(isDark ? DARK : LIGHT).join(", ")})`

/**
 * The 3D bars (m): standing over each desk, clear of the monitors, as tall as
 * the desk's share of days in use.
 */
export const HEAT_BAR = { base: 1.3, maxHeight: 1.7, width: 0.42 }
/** Where a bar ends: its base, the plate under it, the shortest bar, its share. */
export const heatBarTop = (ratio: number) => HEAT_BAR.base + 0.08 + ratio * HEAT_BAR.maxHeight

export const PERIOD_LABEL = {
  "4w": msg("Last 4 weeks"),
  "12w": msg("Last 12 weeks"),
  next: msg("Next 2 weeks"),
}
