import { ListFilter } from "lucide-react"
import { type SidePanel } from "~/editor"
import { DeskFilterOptions, useDeskFilterOptions } from "~/components/office/DeskFilter"
import { msg } from "~/i18n/msg"

/** The office's side panels: which desks the map shows (viewing). */
export const OFFICE_SIDE_PANELS: SidePanel[] = [
  {
    id: "deskFilter",
    label: msg("Filter desks"),
    icon: ListFilter,
    when: "viewing",
    Component: DeskFilterOptions,
    useIsShown: () => useDeskFilterOptions().hasOptions,
    useBadgeCount: () => useDeskFilterOptions().activeCount,
  },
]
