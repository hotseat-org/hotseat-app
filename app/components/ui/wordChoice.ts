import clsx from "clsx"

/**
 * A choice among a few, as a word (the headline's way, as the top bar's
 * sections): the chosen one in ink, underlined in the scheme's colour; the
 * rest quieter. No pill,
 * no fill — they sit straight on the ground.
 */
export const getWordChoiceClass = (isChosen: boolean) =>
  clsx(
    "min-h-11 px-0.5 text-[17px] font-extrabold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
    isChosen
      ? "text-foreground underline decoration-accent decoration-[3px] underline-offset-[7px]"
      : "text-muted hover:text-foreground"
  )
