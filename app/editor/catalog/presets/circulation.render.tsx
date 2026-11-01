import { ArrowUpDownIcon, FootprintsIcon } from "lucide-react"
import { Lift, LIFT } from "../../objects/Lift"
import { STAIRS, Stairs } from "../../objects/Stairs"
import { shade } from "../../plan/shapes"
import { registerRenderers } from "../renderers"
import { msg } from "~/i18n/msg"

registerRenderers({
  // On the plan: its treads, and an arrow up the flight (to the back).
  stairs: {
    Mesh: Stairs,
    drawSymbol: ({ sketch, color }) => {
      const halfWidth = STAIRS.width / 2
      const halfLength = STAIRS.length / 2
      const run = STAIRS.length / STAIRS.steps
      sketch.rect(-halfWidth, -halfLength, halfWidth, halfLength, color, 0.03)
      for (let step = 1; step < STAIRS.steps; step++) {
        const z = halfLength - step * run
        sketch.line(-halfWidth + 0.04, z, halfWidth - 0.04, z, shade(color, 0.7), 0.018)
      }
      const arrowColor = shade(color, 0.45)
      sketch.line(0, halfLength - 0.2, 0, -halfLength + 0.25, arrowColor, 0.035)
      sketch.line(0, -halfLength + 0.22, -0.16, -halfLength + 0.45, arrowColor, 0.035)
      sketch.line(0, -halfLength + 0.22, 0.16, -halfLength + 0.45, arrowColor, 0.035)
      sketch.shadowRect(-halfWidth, -halfLength, halfWidth, halfLength, 0.03)

      return sketch.done(0.7)
    },
    tile: { label: msg("Stairs"), icon: FootprintsIcon, category: "structure" },
  },
  // On the plan: its shaft with a cross, and its doors on the front.
  lift: {
    Mesh: Lift,
    drawSymbol: ({ sketch, color }) => {
      const half = LIFT.size / 2
      const lineColor = shade(color, 0.6)
      sketch.rect(-half, -half, half, half, color, 0.04)
      sketch.line(-half + 0.12, -half + 0.12, half - 0.12, half - 0.12, lineColor, 0.025)
      sketch.line(half - 0.12, -half + 0.12, -half + 0.12, half - 0.12, lineColor, 0.025)
      sketch.rect(-0.4, half - 0.06, 0.4, half + 0.02, "#b9c2cf", 0.01)
      sketch.shadowRect(-half, -half, half, half, 0.04)

      return sketch.done(1.4)
    },
    tile: { label: msg("Lift"), icon: ArrowUpDownIcon, category: "structure" },
  },
})
