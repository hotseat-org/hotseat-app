import { msg } from "~/i18n/msg"

/**
 * What a desk can offer, for admins to tag and people to filter the map by.
 * Add one here and it shows up in the editor and the filters.
 */
export const DESK_FEATURES = [
  { id: "standing", label: msg("Standing desk"), labelPlural: msg("Standing desks") },
] as const
export type DeskFeature = (typeof DESK_FEATURES)[number]["id"]
