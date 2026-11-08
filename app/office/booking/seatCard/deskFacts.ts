import type { SceneObject } from "~/editor/core"
import type { Translator } from "~/i18n/translate"
import { composeNames } from "~/office/headline/composeHeadline"

/** How close (metres, centre to centre) another desk is to count as next to it. */
const NEXT_TO = 2.6

type DeskPlace = Pick<SceneObject, "id" | "x" | "z" | "floor">

/** Another desk in the office, with who sits there on the shown day (none: free). */
export interface DeskAround {
  desk: DeskPlace
  name?: string
}

/**
 * What's worth knowing about a desk, in a sentence each: whose team corner
 * it's in, and who sits next to it on the shown day — or that nobody does, so
 * it's quiet. None about a desk alone in its corner of the office.
 */
export const composeDeskFacts = (
  translator: Translator,
  { seat, desks, teamName }: { seat: DeskPlace; desks: DeskAround[]; teamName?: string }
) => {
  const { t } = translator
  const isNextTo = ({ desk }: DeskAround) =>
    desk.id !== seat.id &&
    desk.floor === seat.floor &&
    Math.hypot(desk.x - seat.x, desk.z - seat.z) <= NEXT_TO
  const around = desks.filter(isNextTo)
  const names = around.flatMap(({ name }) => (name ? [name] : []))
  const facts = teamName ? [t("In {team}'s corner.", { team: teamName })] : []

  if (names.length)
    return [...facts, t("Next to {names}.", { names: composeNames(translator, names) })]

  if (around.length) return [...facts, t("Nobody sits next to it, so it's quiet.")]

  return facts
}
