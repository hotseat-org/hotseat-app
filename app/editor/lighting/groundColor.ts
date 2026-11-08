/**
 * The office's ground as the scene draws it through the day, measured from the
 * rendered picture (the open ground left of the office, sampled each hour and
 * around dawn and dusk, where it changes fastest). Hours → sRGB channels.
 */
const LIGHT: [number, [number, number, number]][] = [
  [0, [100, 112, 141]],
  [1, [99, 111, 140]],
  [2, [96, 107, 136]],
  [3, [90, 101, 129]],
  [4, [80, 91, 116]],
  [5, [65, 76, 96]],
  [5.5, [65, 75, 95]],
  [6, [124, 126, 132]],
  [6.5, [174, 168, 161]],
  [7, [206, 199, 190]],
  [7.5, [213, 207, 197]],
  [8, [218, 213, 203]],
  [9, [226, 222, 214]],
  [10, [231, 228, 220]],
  [11, [234, 231, 224]],
  [12, [235, 232, 225]],
  [13, [234, 231, 224]],
  [14, [231, 228, 220]],
  [15, [226, 222, 214]],
  [16, [218, 213, 203]],
  [16.5, [213, 207, 198]],
  [17, [206, 199, 190]],
  [17.5, [174, 168, 161]],
  [18, [123, 126, 132]],
  [18.5, [65, 75, 95]],
  [19, [65, 76, 96]],
  [20, [79, 91, 115]],
  [21, [89, 101, 128]],
  [22, [96, 107, 136]],
  [23, [99, 111, 140]],
  [24, [100, 112, 141]],
]

const DARK: [number, [number, number, number]][] = [
  [0, [10, 17, 39]],
  [2, [10, 16, 38]],
  [3, [9, 15, 35]],
  [4, [7, 13, 31]],
  [5, [5, 10, 26]],
  [5.5, [5, 10, 26]],
  [6, [11, 16, 30]],
  [6.5, [18, 22, 34]],
  [7, [28, 30, 40]],
  [7.5, [32, 35, 44]],
  [8, [36, 39, 49]],
  [9, [44, 48, 59]],
  [10, [51, 55, 66]],
  [11, [55, 60, 71]],
  [12, [57, 61, 73]],
  [13, [56, 60, 71]],
  [14, [52, 56, 67]],
  [15, [45, 49, 60]],
  [16, [37, 40, 49]],
  [16.5, [33, 35, 44]],
  [17, [28, 31, 40]],
  [17.5, [18, 22, 34]],
  [18, [11, 16, 29]],
  [18.5, [5, 10, 25]],
  [19, [5, 10, 25]],
  [20, [7, 13, 31]],
  [21, [8, 15, 35]],
  [22, [9, 16, 37]],
  [23, [10, 17, 39]],
  [24, [10, 17, 39]],
]

/** The ground's colour at a time of day (hours), as [r, g, b]. */
export const getGroundColor = (time: number, isDark: boolean): [number, number, number] => {
  const hour = ((time % 24) + 24) % 24
  const samples = isDark ? DARK : LIGHT
  const nextIndex = samples.findIndex(([sampleHour]) => sampleHour >= hour)
  const [toHour, to] = samples[Math.max(nextIndex, 1)]
  const [fromHour, from] = samples[Math.max(nextIndex, 1) - 1]
  const amount = toHour === fromHour ? 0 : (hour - fromHour) / (toHour - fromHour)

  return [0, 1, 2].map((channel) =>
    Math.round(from[channel] + (to[channel] - from[channel]) * amount)
  ) as [number, number, number]
}

const toLinear = (channel: number) => {
  const value = channel / 255

  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** Relative luminance (WCAG) of an sRGB colour. */
const getLuminance = ([red, green, blue]: [number, number, number]) =>
  0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)

/** The light theme's ink and the night's near-white (see tailwind.css). */
const INK_LUMINANCE = getLuminance([51, 56, 74])
const LIGHT_TEXT_LUMINANCE = getLuminance([251, 248, 242])

/** Whether light words read better than ink on this ground (the higher contrast wins). */
export const isGroundDark = (ground: [number, number, number]) => {
  const luminance = getLuminance(ground)
  const inkContrast = (luminance + 0.05) / (INK_LUMINANCE + 0.05)
  const lightContrast = (LIGHT_TEXT_LUMINANCE + 0.05) / (luminance + 0.05)

  return lightContrast > inkContrast
}
