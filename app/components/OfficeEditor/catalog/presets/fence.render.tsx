import { FenceIcon } from "lucide-react"
import { Fence } from "../../objects/Fence"
import { registerRenderers } from "../renderers"
import { msg } from "~/i18n/msg"

registerRenderers({
  // Segment by segment (its slats line up), and on the plan a slim line in its colour.
  fence: {
    Mesh: Fence,
    planRun: { thickness: 0.35, opacity: 1 },
    tile: { label: msg("Fence"), icon: FenceIcon, category: "structure" },
  },
})
