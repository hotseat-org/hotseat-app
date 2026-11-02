/** Where offices are when nothing else says (the database's default too). */
export const DEFAULT_TIME_ZONE = "Europe/Prague"

/** Whether `zone` is an IANA time zone this runtime knows ("Europe/Prague"). */
export const isTimeZone = (zone: unknown): zone is string => {
  if (typeof zone !== "string" || !zone) return false

  try {
    new Intl.DateTimeFormat("en", { timeZone: zone })

    return true
  } catch {
    return false
  }
}

/** The browser's own time zone (where the person is), if it says. */
export const getBrowserTimeZone = () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return isTimeZone(zone) ? zone : null
}

/** Every time zone there is, A–Z (with UTC). (Every current browser and Node has the list.) */
export const listTimeZones = () => {
  const { supportedValuesOf } = Intl as unknown as { supportedValuesOf: (key: string) => string[] }
  const zones = supportedValuesOf("timeZone")

  return zones.includes("UTC") ? zones : [...zones, "UTC"].sort()
}

/** Its offset from UTC now, e.g. "GMT+1" (summer time included). */
export const getTimeZoneOffset = (zone: string, now = new Date()) =>
  new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value ?? ""

/** "America/New_York" → "America / New York". */
export const formatTimeZone = (zone: string) => zone.replace(/_/g, " ").replace(/\//g, " / ")
