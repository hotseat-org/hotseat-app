import { RoundedBox as DreiRoundedBox } from "@react-three/drei"
import { forwardRef, type ComponentProps } from "react"
import type { Mesh } from "three"

type Props = ComponentProps<typeof DreiRoundedBox>

/**
 * drei's RoundedBox, with its edges as round as its corners. drei rounds the
 * edges along the depth with `bevelSegments × 2` steps (8 by default) whatever
 * the `smoothness` of the corners (2–4 here): ~1,300 triangles even for a
 * mouse. Matching the two looks the same and costs a half to a fifth.
 */
export const RoundedBox = forwardRef<Mesh, Props>(function RoundedBox(
  { smoothness = 4, bevelSegments = Math.ceil(smoothness / 2), ...props },
  ref
) {
  return (
    <DreiRoundedBox ref={ref} smoothness={smoothness} bevelSegments={bevelSegments} {...props} />
  )
})
