import { useEffect, useMemo } from "react"
import { isSeatable } from "../catalog"
import { useDesksOnDay } from "../booking/useBooking"
import { routeBounds, useRoute } from "../wayfinding/wayfinding"
import { DeskPets } from "../desks/DeskPets"
import { HeatBars } from "../heatmap/HeatBars"
import { HeatPads } from "../heatmap/HeatPads"
import { RouteLine } from "../wayfinding/RouteLine"
import { SeatPopup } from "../desks/SeatPopup"
import { SeatTags } from "../desks/SeatTags"
import { ZoneFloor } from "../zones/ZoneFloor"
import { useOfficeStore, useOfficeStoreApi } from "../store"
import { type SceneLayer, type SceneLayerProps, type ViewClicks } from "~/editor"

/** Who sits where, while the Desk tags layer is on. */
const SeatTagsLayer = () => {
  const isShown = useOfficeStore((state) => state.layers.deskTags)

  return isShown ? <SeatTags /> : null
}

/** Team zones, their floor tinted and their names, while the Zones layer is on. */
const ZoneFloorLayer = ({ isEditing, isDark }: SceneLayerProps) => {
  const isShown = useOfficeStore((state) => state.layers.zones)

  return isShown ? <ZoneFloor isEditing={isEditing} isDark={isDark} /> : null
}

/** The desk card lives in the scene (it follows its desk): it closes when the mode changes. */
const SeatCardReset = ({ isEditing }: SceneLayerProps) => {
  const store = useOfficeStoreApi()
  useEffect(() => {
    store.getState().closeSeatCard()
  }, [isEditing, store])

  return null
}

/** The way to a desk: framed once shown (or asked for again). */
const RouteFraming = () => {
  const route = useRoute()
  const requestFrame = useOfficeStore((state) => state.requestFrame)
  const currentFloor = useOfficeStore((state) => state.currentFloor)
  const points = route?.path?.points
  // Framed when asked for, and on each floor it's followed to (where it passes).
  const frameKey = points?.length ? `${route?.nonce}:${currentFloor}` : null
  useEffect(() => {
    if (points?.length) requestFrame(routeBounds(points))
    // Only when a way is asked for or followed — not as it's recomputed.
  }, [frameKey])

  return null
}

/** What the office draws in the 3D scene. */
export const OFFICE_SCENE_LAYERS: SceneLayer[] = [
  { Component: SeatCardReset, when: "always" },
  { Component: SeatTagsLayer, when: "viewing" },
  { Component: DeskPets, when: "viewing" },
  { Component: SeatPopup, when: "viewing" },
  { Component: RouteLine, when: "viewing" },
  { Component: RouteFraming, when: "viewing" },
  { Component: HeatPads, when: "viewing" },
  { Component: HeatBars, when: "viewing" },
  { Component: ZoneFloorLayer, when: "always" },
]

/** Viewing: who's in at each desk on the shown day (clutter, monitor, pet). */
export const useOfficePieceStates = (isViewing: boolean) => {
  const { floorDesks: desks } = useDesksOnDay()

  return useMemo(
    () =>
      isViewing
        ? new Map(desks.map((seat) => [seat.desk.id, { isOccupied: seat.state.kind !== "free" }]))
        : null,
    [isViewing, desks]
  )
}

/** Viewing: a desk opens its card; the bare floor closes it. */
export const useOfficeViewClicks = (): ViewClicks => {
  const openSeatCard = useOfficeStore((state) => state.openSeatCard)
  const closeSeatCard = useOfficeStore((state) => state.closeSeatCard)

  return {
    isClickable: (object) => isSeatable(object.type),
    onPiece: openSeatCard,
    onFloor: closeSeatCard,
  }
}
