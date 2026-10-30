import type { TourStep } from "../ui/GuidedTour"
import type { EditorState } from "../store"
import { isSeatable } from "../types"
import { msg } from "~/i18n/msg"

const deskCount = (state: EditorState) =>
  state.objects.filter((object) => isSeatable(object.type)).length

/** The office's steps in the guided tour: placing desks, then zones and booking. */
export const OFFICE_TOUR_STEPS: { after: string; step: TourStep }[] = [
  {
    after: "drawRoom",
    step: {
      id: "addDesks",
      title: msg("Add desks"),
      body: msg(
        "In Desks, pick the desk and click the floor. Choose Row or Pod and drag to lay many at once."
      ),
      target: "catalog",
      isDone: (now, start) => deskCount(now) > deskCount(start),
    },
  },
  {
    after: "find",
    step: {
      id: "teams",
      title: msg("Teams and booking"),
      body: msg(
        "Select desks and give them a zone, so each team finds and books its own area. Everything saves as you go."
      ),
    },
  },
]
