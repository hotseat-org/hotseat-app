import clsx from "clsx"

/**
 * A choice among a few, as a word (the headline's way, as the top bar's
 * sections): the chosen one in ink, underlined in the scheme's colour; the
 * rest quieter. No pill, no fill — they sit straight on the ground. A radio
 * group (see rovingFocus): its row is one Tab stop, the arrows choose.
 */
export const getWordChoiceClass = (isChosen: boolean) =>
  clsx(
    "min-h-11 px-0.5 text-base font-extrabold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring",
    isChosen
      ? "text-text underline decoration-mark-accent decoration-[3px] underline-offset-[7px]"
      : "text-text-muted hover:text-text"
  )
