import { Html } from "@react-three/drei"
import { STOREY } from "../objects/dimensions"
import { LiftButtons } from "../ui/LiftButtons"
import { useLiftPanel } from "../ui/useLiftButtons"

/**
 * Viewing: the pressed lift's floor buttons, floating over it (see
 * useLiftPanel) — it stays open from floor to floor, the lift being on all.
 */
export const LiftPanel = () => {
  // Made here, outside <Html>'s own root (it has no contexts).
  const panel = useLiftPanel()
  if (!panel) return null

  const { lift, ...buttons } = panel

  return (
    <Html position={[lift.x, STOREY + 0.25, lift.z]} center zIndexRange={[20, 10]}>
      <LiftButtons {...buttons} />
    </Html>
  )
}
