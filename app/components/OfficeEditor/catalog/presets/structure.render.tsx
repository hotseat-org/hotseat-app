import { Door } from "../../objects/Door"
import { GlassDoor } from "../../objects/GlassDoor"
import { GlassWall } from "../../objects/GlassWall"
import { Wall } from "../../objects/Wall"
import { Window } from "../../objects/Window"
import { registerRenderers } from "../renderers"

registerRenderers({
  wall: { Mesh: Wall },
  door: { Mesh: Door },
  window: { Mesh: Window },
  glassWall: { Mesh: GlassWall },
  glassDoor: { Mesh: GlassDoor },
  // A data marker: never rendered.
  floorPaint: { Mesh: () => <></>, drawSymbol: null },
})
