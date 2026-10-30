import {
  AppWindowIcon,
  BrickWallIcon,
  Columns2Icon,
  DoorClosedIcon,
  DoorOpenIcon,
} from "lucide-react"
import { Door } from "../../objects/Door"
import { GlassDoor } from "../../objects/GlassDoor"
import { GlassWall } from "../../objects/GlassWall"
import { Wall } from "../../objects/Wall"
import { Window } from "../../objects/Window"
import { WINDOW_GLASS } from "../../plan/sketch"
import { StructureIcon } from "../../ui/categoryIcons"
import { registerCategories } from "../categories"
import { registerRenderers } from "../renderers"
import { msg } from "~/i18n/msg"

registerRenderers({
  wall: {
    Mesh: Wall,
    isDrawnAsRun: true,
    tile: { label: msg("Wall"), icon: BrickWallIcon, key: "2", category: "structure" },
  },
  door: {
    Mesh: Door,
    tile: { label: msg("Door"), icon: DoorOpenIcon, key: "3", category: "structure" },
  },
  window: {
    Mesh: Window,
    tile: { label: msg("Window"), icon: AppWindowIcon, category: "structure" },
  },
  // On the plan, a slimmer see-through line.
  glassWall: {
    Mesh: GlassWall,
    isDrawnAsRun: true,
    planRun: { color: WINDOW_GLASS, thickness: 0.5, opacity: 0.8 },
    tile: { label: msg("Glass wall"), icon: Columns2Icon, category: "structure" },
  },
  glassDoor: {
    Mesh: GlassDoor,
    tile: { label: msg("Glass door"), icon: DoorClosedIcon, category: "structure" },
  },
  // A data marker: never rendered.
  floorPaint: { Mesh: () => <></>, drawSymbol: null },
})

registerCategories([
  {
    id: "structure",
    label: msg("Structure"),
    icon: StructureIcon,
    leadingTools: ["room"],
  },
])
