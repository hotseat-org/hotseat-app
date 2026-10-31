import { Shapes, Tag } from "lucide-react"
import { getZones } from "../zones/zones"
import { type MapLayer } from "~/editor"
import { msg } from "~/i18n/msg"

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
