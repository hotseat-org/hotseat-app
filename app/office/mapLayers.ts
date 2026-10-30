import { Shapes, Tag } from "lucide-react"
import { getZones } from "./zones"
import type { MapLayer, MapMenuSection } from "~/editor/module"
import { DeskFilterOptions, useDeskFilterOptions } from "~/components/office/DeskFilter"
import { msg } from "~/i18n/msg"

declare module "~/editor/store/preferences" {
  interface Layers {
    /** Team zones: their floor and names. */
    zones: boolean
    /** Viewing: who sits where, and which desks are free. */
    deskTags: boolean
  }
}

/** The office's layers of the map. */
export const OFFICE_MAP_LAYERS: MapLayer[] = [
  {
    id: "zones",
    label: msg("Zones"),
    hint: msg("Team areas and their names"),
    icon: Shapes,
    when: "always",
    isOnByDefault: true,
    hintFor: (objects) =>
      getZones(objects).length === 0 ? msg("None yet — give desks a zone") : null,
  },
  {
    id: "deskTags",
    label: msg("Desk tags"),
    hint: msg("Who sits where, and free desks"),
    icon: Tag,
    when: "viewing",
    isOnByDefault: true,
  },
]

/** The Map menu's foot, viewing: show only a zone's desks, standing desks… */
export const OFFICE_MAP_MENU_SECTION: MapMenuSection = {
  heading: msg("Show only"),
  Component: DeskFilterOptions,
  useIsShown: () => useDeskFilterOptions().hasOptions,
  useChangeCount: () => useDeskFilterOptions().activeCount,
}
