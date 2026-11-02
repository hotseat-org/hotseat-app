import { Modal } from "@heroui/react"
import clsx from "clsx"
import { MapPin, Pin, Search, X } from "lucide-react"
import { useMemo, useState } from "react"
import { deskName, useDeskFloor } from "../booking/useBooking"
import { useOfficeStore } from "../store"
import { isPerfect, type MatchDesk } from "./matching"
import { MiniPlan } from "./MiniPlan"
import {
  ANY_DAY,
  AddPreference,
  Checklist,
  DayChips,
  PRIMARY_BUTTON,
  RuleRows,
  SECONDARY_BUTTON,
  SECTION_TITLE,
  addRule,
  type When,
} from "./parts"
import {
  useColleagueDeskIds,
  useFloorDesks,
  useSavedRules,
  useSeatMatches,
  useShowSeatOnMap,
} from "./useFindSeat"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Other desks that fit, offered under the best one. */
const ALTERNATIVES = 3

/**
 * Finding a seat on a wide screen: a dialog over the office — when and
 * your preferences on the left (each a must or a preference), the desk
 * that fits best on the right as they change: where it is, why it fits,
 * others that do, and Book.
 */
export const FindSeatDialog = ({ onClose }: { onClose: () => void }) => {
  const { t } = useI18n()

  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && onClose()} isDismissable>
      <Modal.Container scroll="inside">
        <Modal.Dialog className="w-[1040px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[calc(var(--radius)*3)] p-0">
          <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border pl-6 pr-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
              <Search className="size-[18px]" strokeWidth={2.4} />
            </span>
            <Modal.Heading className="block flex-1 truncate text-lg font-black text-foreground">
              {t("Find me a seat")}
            </Modal.Heading>
            <button
              type="button"
              aria-label={t("Close")}
              onClick={onClose}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              <X className="size-[18px]" strokeWidth={2.4} />
            </button>
          </div>
          <FindSeatBody onClose={onClose} />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

const FindSeatBody = ({ onClose }: { onClose: () => void }) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const { rules, setRules } = useSavedRules()
  const seats = useSeatMatches(rules)
  const shownDay = useOfficeStore((state) => state.booking.day)
  const reserve = useOfficeStore((state) => state.booking.reserve)
  const isPending = useOfficeStore((state) => state.booking.pending)
  const showSeatOnMap = useShowSeatOnMap()
  const getDeskFloor = useDeskFloor()
  const [isAdding, setIsAdding] = useState(false)
  const [when, setWhen] = useState<When>(() =>
    seats.dayChoices.includes(shownDay) ? shownDay : (seats.dayChoices[0] ?? ANY_DAY)
  )
  const [pickedDeskId, setPickedDeskId] = useState<string | null>(null)

  const day = when === ANY_DAY ? null : when
  const dayResult = useMemo(() => (day ? seats.onDay(day) : null), [seats, day])
  const anyDays = useMemo(() => (when === ANY_DAY ? seats.anyDay() : []), [seats, when])
  const matches = dayResult?.matches ?? []
  const best = matches.find((match) => match.desk.id === pickedDeskId) ?? matches[0]
  const alternatives = matches.filter((match) => match !== best).slice(0, ALTERNATIVES)
  const floorDesks = useFloorDesks(best?.desk)
  const colleagueDeskIds = useColleagueDeskIds(rules, day)

  const describeDesk = (desk: MatchDesk) =>
    [desk.zone, getDeskFloor(desk)].filter(Boolean).join(" · ")
  const showOnMap = (deskId: string, onDay: Day) => {
    showSeatOnMap(deskId, onDay)
    onClose()
  }
  const book = (desk: MatchDesk, onDay: Day) => {
    reserve([{ deskId: desk.id, dates: [onDay] }])
    showOnMap(desk.id, onDay)
  }
  const pickWhen = (next: When) => {
    setWhen(next)
    setPickedDeskId(null)
  }

  return (
    <div className="flex flex-wrap">
      <div className="min-w-0 flex-[1_1_440px] px-6 pt-5 pb-6">
        {isAdding ? (
          <AddPreference
            rules={rules}
            onAdd={(rule) => {
              setRules(addRule(rules, rule))
              setIsAdding(false)
            }}
            onBack={() => setIsAdding(false)}
          />
        ) : (
          <>
            <h3 className={clsx(SECTION_TITLE, "mb-2.5")}>{t("When")}</h3>
            <div className="flex flex-wrap gap-2">
              <DayChips days={seats.dayChoices} value={when} onChange={pickWhen} isWrapping />
              <button
                type="button"
                aria-pressed={when === ANY_DAY}
                onClick={() => pickWhen(ANY_DAY)}
                className={clsx(
                  "min-h-10 rounded-full border px-3.5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                  when === ANY_DAY
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-surface hover:border-muted"
                )}
              >
                {t("I don't mind when")}
              </button>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <h3 className={SECTION_TITLE}>{t("Preferences")}</h3>
              <span className="text-xs text-muted">{t("Must · Prefer")}</span>
            </div>
            <RuleRows
              rules={rules}
              onChange={setRules}
              onAdd={() => setIsAdding(true)}
              hasKinds={false}
            />
          </>
        )}
      </div>

      <div className="flex min-h-[460px] min-w-0 flex-[1_1_380px] flex-col bg-surface-secondary px-6 pt-5 pb-6">
        {seats.isResident && (
          <p className="flex items-center gap-2 text-sm font-bold">
            <Pin className="size-4 shrink-0 text-accent" />
            {t("You have a permanent desk here: it's yours every day.")}
          </p>
        )}

        {!seats.isResident && day && dayResult?.current && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm font-bold">
              {t("You're at {desk} that day.", { desk: deskName(i18n, dayResult.current) })}
            </p>
            <button
              type="button"
              onClick={() => showOnMap(dayResult.current!.id, day)}
              className={clsx(SECONDARY_BUTTON, "flex items-center gap-2")}
            >
              <MapPin className="size-4" />
              {t("Show on map")}
            </button>
          </div>
        )}

        {!seats.isResident && day && !dayResult?.current && !best && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm font-bold">{t("Nothing fits that day.")}</p>
            <button type="button" onClick={() => pickWhen(ANY_DAY)} className={SECONDARY_BUTTON}>
              {t("Try any day")}
            </button>
          </div>
        )}

        {!seats.isResident && day && best && (
          <>
            <p className={SECTION_TITLE}>
              {isPerfect(best) ? t("Best match") : t("Closest match")} · {format.long(day)}
            </p>
            <div className="mt-3">
              <MiniPlan
                desks={floorDesks}
                highlightId={best.desk.id}
                colleagueIds={colleagueDeskIds}
                label={t("{desk} on the plan", { desk: deskName(i18n, best.desk) })}
              />
            </div>
            <h3 className="mt-4 text-[26px] font-black leading-tight">
              {deskName(i18n, best.desk)}
            </h3>
            {describeDesk(best.desk) && (
              <p className="text-sm text-muted">{describeDesk(best.desk)}</p>
            )}
            <div className="mt-2.5">
              <Checklist match={best} />
            </div>
            {alternatives.length > 0 && (
              <p className="mt-3.5 flex flex-wrap items-center gap-x-1 text-[13px] text-muted">
                {t("Also fits:")}
                {alternatives.map((match, index) => (
                  <span key={match.desk.id} className="flex items-center gap-1">
                    {index > 0 && <span aria-hidden>·</span>}
                    <button
                      type="button"
                      onClick={() => setPickedDeskId(match.desk.id)}
                      className="min-h-8 rounded font-bold text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {match.desk.label ?? deskName(i18n, match.desk)}
                    </button>
                  </span>
                ))}
              </p>
            )}
            <div className="mt-auto flex gap-2.5 pt-5">
              <button
                type="button"
                onClick={() => showOnMap(best.desk.id, day)}
                className={SECONDARY_BUTTON}
              >
                {t("Show on map")}
              </button>
              <button
                type="button"
                onClick={() => book(best.desk, day)}
                disabled={isPending}
                className={clsx(PRIMARY_BUTTON, "flex-1")}
              >
                {t("Book {desk}", { desk: deskName(i18n, best.desk) })}
              </button>
            </div>
          </>
        )}

        {!seats.isResident && when === ANY_DAY && (
          <>
            <p className={SECTION_TITLE}>{t("The first days that fit")}</p>
            {anyDays.length === 0 && (
              <p className="mt-3 text-sm font-bold">
                {t("No day fits while desks can be booked.")}
              </p>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {anyDays.map(({ day: matchDay, matches: dayMatches }) => {
                const first = dayMatches[0]

                return (
                  <li
                    key={matchDay}
                    className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-surface"
                  >
                    <span className="w-16 shrink-0 text-sm font-black">
                      {format.short(matchDay)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold">
                        {deskName(i18n, first.desk)}
                      </span>
                      <span
                        className={clsx(
                          "block text-xs font-bold",
                          isPerfect(first) ? "text-foreground" : "text-muted"
                        )}
                      >
                        {isPerfect(first)
                          ? t("Everything you asked for")
                          : t("{met} of {total}", { met: first.met.length, total: rules.length })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => book(first.desk, matchDay)}
                      disabled={isPending}
                      className={clsx(PRIMARY_BUTTON, "min-h-11 shrink-0 px-4")}
                    >
                      {t("Book")}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
