import { Door } from "../../objects/Door"
import { GlassDoor } from "../../objects/GlassDoor"
import { GlassWall } from "../../objects/GlassWall"
import { Wall } from "../../objects/Wall"
import { Window } from "../../objects/Window"
import { WINDOW_GLASS } from "../../plan/sketch"
import { registerRenderers } from "../renderers"

registerRenderers({
  wall: { Mesh: Wall, isDrawnAsRun: true },
  door: { Mesh: Door },
  window: { Mesh: Window },
  // On the plan, a slimmer see-through line.
  glassWall: {
    Mesh: GlassWall,
    isDrawnAsRun: true,
    planRun: { color: WINDOW_GLASS, thickness: 0.5, opacity: 0.8 },
  },
  glassDoor: { Mesh: GlassDoor },
  // A data marker: never rendered.
  floorPaint: { Mesh: () => <></>, drawSymbol: null },
})
