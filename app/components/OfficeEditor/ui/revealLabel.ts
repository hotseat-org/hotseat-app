/**
 * A bar's button labels, shown only while the bar is hovered or has keyboard
 * focus: each slides out to the right of its icon and the bar widens with it
 * (the container carries `group/bar`). Screen readers get the name anyway
 * (aria-label); reduced motion skips the slide.
 */
export const REVEAL_LABEL =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/bar:ml-2 group-hover/bar:max-w-40 group-hover/bar:opacity-100 group-focus-within/bar:ml-2 group-focus-within/bar:max-w-40 group-focus-within/bar:opacity-100 motion-reduce:transition-none"
