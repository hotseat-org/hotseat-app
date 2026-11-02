/**
 * How zones' names are shown, while choosing between them: lettered on the
 * floor (the default), as a pill at the zone's back edge (`?zoneLabels=edge`),
 * or as a pill in its middle (`?zoneLabels=pill`, as before).
 * TODO: keep the one chosen, remove the others.
 */
export type ZoneLabelStyle = "floor" | "edge" | "pill"

export const getZoneLabelStyle = (): ZoneLabelStyle => {
  if (typeof window === "undefined") return "floor"

  const asked = new URLSearchParams(window.location.search).get("zoneLabels")

  return asked === "edge" || asked === "pill" ? asked : "floor"
}
