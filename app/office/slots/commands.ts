import { Hash, SquareDashedMousePointer } from "lucide-react"
import { isSeatable } from "../catalog"
import { getZones } from "../zones/zones"
import { GROUP, selectAll, type Command } from "~/editor"
import { msg } from "~/i18n/msg"

/** The office's commands: selecting and numbering desks. */
export const OFFICE_COMMANDS: Command[] = [
  {
    id: "selectDesks",
    isOnFloorMenu: true,
    label: msg("Select all desks"),
    group: GROUP.edit,
    icon: SquareDashedMousePointer,
    isAvailable: (state) => state.objects.some((object) => isSeatable(object.type)),
    run: (state) =>
      selectAll(
        state,
        state.objects.filter((object) => isSeatable(object.type)).map((object) => object.id)
      ),
  },
  {
    id: "numberDesks",
    isOnFloorMenu: true,
    label: msg("Number the unnumbered desks"),
    group: GROUP.edit,
    icon: Hash,
    isAvailable: (state) =>
      state.objects.some((object) => isSeatable(object.type) && !object.label),
    run: (state) => state.numberDesks(),
  },
  {
    id: "numberDesksByZone",
    label: msg("Number desks by zone"),
    group: GROUP.edit,
    icon: Hash,
    isAvailable: (state) => getZones(state.objects).length > 0,
    run: (state) => state.numberDesksByZone(),
  },
]
