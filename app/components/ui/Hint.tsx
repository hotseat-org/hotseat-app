import { Tooltip } from "@heroui/react"
import type { ComponentProps, ReactNode } from "react"
import { Focusable } from "react-aria"

export type HintPlacement = "top" | "bottom" | "left" | "right"

/** A plain element (e.g. a <button>), as Focusable takes it. */
export type HintTarget = ComponentProps<typeof Focusable>["children"]

/**
 * A tooltip over a plain element (a <button> of ours, not the kit's): its name
 * in the ground's colour on ink (the design system's Tooltip, see
 * tailwind.css). The kit's tooltip opens only for something focusable it
 * knows — Focusable hands it our element as it is, with no wrapper.
 */
export const Hint = ({
  text,
  placement = "top",
  delay = 350,
  children,
}: {
  text: ReactNode
  placement?: HintPlacement
  delay?: number
  /** One focusable element that takes a ref (e.g. a <button>). */
  children: HintTarget
}) => (
  <Tooltip delay={delay}>
    <Focusable>{children}</Focusable>
    <Tooltip.Content placement={placement}>{text}</Tooltip.Content>
  </Tooltip>
)
