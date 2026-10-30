import { randomModelId } from "../models"
import { useEditorStore } from "../store"
import { type SceneObject } from "../types"
import { isSeatable } from "./catalog"
import { DateStepper } from "./ui/DateStepper"
import { asNewDesks } from "./store"
import type { Translator } from "~/i18n/translate"

/** The bottom bar's day shown (booking a real office). */
export const OfficeDay = () => {
  const isBooking = useEditorStore((state) => state.booking.enabled)
  return isBooking ? <DateStepper /> : null
}

/** "8 desks" — a room's, a saved room's; null without any. */
export const describeDesks = (objects: SceneObject[], { tn }: Translator) => {
  const desks = objects.filter((object) => isSeatable(object.type)).length
  return desks > 0 ? tn(desks, "{n} desk", "{n} desks") : null
}

/**
 * New pieces: desks get the next free number and no resident (see
 * asNewDesks); a deskmate gets a random animal on its chair.
 */
export const prepareNewOfficePieces = (existing: SceneObject[], fresh: SceneObject[]) =>
  asNewDesks(existing, fresh).map((object) =>
    object.type === "deskmate" && !object.model ? { ...object, model: randomModelId() } : object
  )
