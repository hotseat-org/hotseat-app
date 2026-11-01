/**
 * A bar's button labels, shown only while the bar is hovered, has keyboard
 * focus or is held open (`data-open`, e.g. while its menu is): each slides
 * out to the right of its icon and the bar widens with it (the container
 * carries `group/bar`). Keyboard focus only (`:focus-visible`), not any
 * focus: a modal opened from the bar hands focus back to its button when it
 * closes, and the bar mustn't open then, the pointer long gone. Screen
 * readers get the name anyway (aria-label); reduced motion skips the slide.
 */
export const REVEAL_LABEL =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/bar:ml-2 group-hover/bar:max-w-40 group-hover/bar:opacity-100 group-has-[:focus-visible]/bar:ml-2 group-has-[:focus-visible]/bar:max-w-40 group-has-[:focus-visible]/bar:opacity-100 group-data-[open]/bar:ml-2 group-data-[open]/bar:max-w-40 group-data-[open]/bar:opacity-100 motion-reduce:transition-none"
