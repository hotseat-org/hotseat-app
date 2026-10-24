import { RoundedBox as DreiRoundedBox } from "@react-three/drei"
import { forwardRef, type ComponentProps } from "react"
import type { Mesh } from "three"

type Props = ComponentProps<typeof DreiRoundedBox>

/**
 * drei's RoundedBox, its depth edges rounded in `bevelSegments × 2` steps:
 * twice the corners' `smoothness` (2–4 here), so long edges catch the light as
 * smooth curves rather than facets. (Was half that for speed — but furniture
 * is merged into a few meshes now, and triangles there cost little next to
 * the draw calls that merging saved.)
 */
export const RoundedBox = forwardRef<Mesh, Props>(function RoundedBox(
  { smoothness = 4, bevelSegments = smoothness, ...props },
  ref
) {
  return (
    <DreiRoundedBox ref={ref} smoothness={smoothness} bevelSegments={bevelSegments} {...props} />
  )
})
