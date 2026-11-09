import type { KeyboardEvent } from "react"

/**
 * One stop for the Tab key in a row of choices (tabs, radios): the chosen one
 * takes the focus, the arrows (Home, End) move it along the row.
 */

/** Where an arrow key (Home, End) moves the focus in a row of choices; wraps around. */
export const getNextChoiceIndex = (key: string, index: number, count: number) => {
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % count
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + count) % count
  if (key === "Home") return 0
  if (key === "End") return count - 1
}

/** Moves the focus to the next choice of this role in the row; returns it. */
export const focusNextChoice = (event: KeyboardEvent<HTMLElement>, role: "tab" | "radio") => {
  const choices = [...event.currentTarget.querySelectorAll<HTMLElement>(`[role=${role}]`)]
  const index = choices.indexOf(document.activeElement as HTMLElement)
  const nextIndex = getNextChoiceIndex(event.key, index, choices.length)
  if (index === -1 || nextIndex === undefined) return

  event.preventDefault()
  choices[nextIndex].focus()

  return choices[nextIndex]
}

/** A radio group's keys: the arrows move the focus and choose (as native radios). */
export const handleRadioGroupKeyDown = (event: KeyboardEvent<HTMLElement>) => {
  focusNextChoice(event, "radio")?.click()
}

/** A choice in a radio group: only the chosen one is a Tab stop. */
export const getRadioProps = (isChecked: boolean) => ({
  role: "radio" as const,
  "aria-checked": isChecked,
  tabIndex: isChecked ? 0 : -1,
})
