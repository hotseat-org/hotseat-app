import { Fence } from "../../objects/Fence"
import { registerRenderers } from "../renderers"

registerRenderers({
  // Segment by segment (its slats line up), and on the plan a slim line in its colour.
  fence: { Mesh: Fence, planRun: { thickness: 0.35, opacity: 1 } },
})
