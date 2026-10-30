import { useEffect, useMemo } from "react"
import { isSeatable } from "../catalog"
import { useDesksOnDay } from "../useBooking"
import { routeBounds, useRoute } from "../wayfinding"
import { DeskPets } from "./DeskPets"
import { HeatBars } from "./HeatBars"
import { HeatPads } from "./HeatPads"
import { RouteLine } from "./RouteLine"
import { SeatPopup } from "./SeatPopup"
import { SeatTags } from "./SeatTags"
import { ZoneFloor } from "./ZoneFloor"
import { useEditorStore, useEditorStoreApi } from "~/editor/store"
import type { SceneLayer, SceneLayerProps, ViewClicks } from "~/editor/module"

/** Who sits where, while the Desk tags layer is on. */
const SeatTagsLayer = () => {
  const isShown = useEditorStore((state) => state.layers.deskTags)

  return isShown ? <SeatTags /> : null
}

/** Team zones, their floor tinted and their names, while the Zones layer is on. */
const ZoneFloorLayer = ({ isEditing, isDark }: SceneLayerProps) => {
  const isShown = useEditorStore((state) => state.layers.zones)

  return isShown ? <ZoneFloor isEditing={isEditing} isDark={isDark} /> : null
}

/** The desk card lives in the scene (it follows its desk): it closes when the mode changes. */
const SeatCardReset = ({ isEditing }: SceneLayerProps) => {
  const store = useEditorStoreApi()
  useEffect(() => {
    store.getState().closeSeatCard()
  }, [isEditing, store])

  return null
}

/** The way to a desk: framed once shown (or asked for again). */
const RouteFraming = () => {
  const route = useRoute()
  const requestFrame = useEditorStore((state) => state.requestFrame)
  const routeNonce = route?.path ? route.nonce : null
  useEffect(() => {
    if (route?.path) requestFrame(routeBounds(route.path.points))
    // Only when a way is asked for — not as it's recomputed.
  }, [routeNonce])

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
  const { desks } = useDesksOnDay()

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
  const openSeatCard = useEditorStore((state) => state.openSeatCard)
  const closeSeatCard = useEditorStore((state) => state.closeSeatCard)

  return {
    isClickable: (object) => isSeatable(object.type),
    onPiece: openSeatCard,
    onFloor: closeSeatCard,
  }
}
