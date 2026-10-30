import { Button } from "@heroui/react"
import clsx from "clsx"
import { useState } from "react"
import { StepHeader, type BodyProps } from "./SeatCardBody"
import type { Translator } from "~/i18n/translate"

/**
 * Your usual desk: booked for you on the weekdays picked, as each opens up for
 * booking (a taken day gets a similar desk; a full day, the waitlist).
 */
export const UsualStep = ({
  i18n,
  usual,
  pending,
  isSheet,
  onBack,
  onSet,
  onClear,
}: {
  i18n: Translator
  usual: NonNullable<BodyProps["usual"]>
  pending: boolean
  isSheet: boolean
  onBack: () => void
  onSet: (weekdays: number[]) => void
  onClear: () => void
}) => {
  const [days, setDays] = useState<number[]>(usual.weekdays ?? usual.suggested)
  const isUsual = !!usual.weekdays
  const { t, format } = i18n

  return (
    <div className="flex flex-col gap-2.5">
      <StepHeader i18n={i18n} title={t("Your usual desk")} onBack={onBack} />
      <div className="flex gap-1 px-1">
        {format.workdays().map((name, i) => {
          const weekday = i + 1
          const on = days.includes(weekday)

          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setDays(
                  on
                    ? days.filter((selected) => selected !== weekday)
                    : [...days, weekday].sort((first, second) => first - second)
                )
              }
              className={clsx(
                "flex-1 rounded-lg border text-xs font-bold transition-colors",
                isSheet ? "h-11" : "h-9",
                on
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-muted"
              )}
            >
              {name.slice(0, 2)}
            </button>
          )
        })}
      </div>
      <p className="px-1 text-[0.72rem] leading-snug text-muted">
        {t(
          "Booked for you as each day opens up. If it's taken, you get a similar desk; if the office is full, a place on the waitlist."
        )}
        {usual.replaces && ` ${t("Replaces your usual {desk}.", { desk: usual.replaces })}`}
      </p>
      <div className="flex items-center justify-between gap-2 px-1">
        {isUsual ? (
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="text-xs font-bold text-danger hover:underline"
          >
            {t("Stop booking it")}
          </button>
        ) : (
          <span />
        )}
        <Button
          size={isSheet ? "md" : "sm"}
          variant="primary"
          isDisabled={!days.length || pending}
          onPress={() => onSet(days)}
        >
          {isUsual ? t("Save days") : t("Make it my usual desk")}
        </Button>
      </div>
    </div>
  )
}
