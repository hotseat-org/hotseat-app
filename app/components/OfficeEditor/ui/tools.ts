import { Eraser, MousePointer2, SquareDashed, type LucideIcon } from "lucide-react"
import { getTiles } from "../catalog/rendering"
import type { Tool } from "../types"
import { msg } from "~/i18n/msg"

export interface ToolMeta {
  tool: Tool
  label: string
  icon: LucideIcon
  /** Number-key shortcut (empty = none). */
  key: string
}

/**
 * Every tool: Select and Room, each kind with a tile in the catalogue (see
 * ItemRenderer.tile, registered by the presets), and Erase.
 */
let tools: ToolMeta[] | null = null
/** Built on first use, once every preset has registered its kinds. */
export const getTools = (): ToolMeta[] =>
  (tools ??= [
    { tool: "select", label: msg("Select"), icon: MousePointer2, key: "1" },
    { tool: "room", label: msg("Room"), icon: SquareDashed, key: "" },
    ...getTiles().map(({ type, label, icon, key }) => ({
      tool: type,
      label,
      icon,
      key: key ?? "",
    })),
    { tool: "delete", label: msg("Erase"), icon: Eraser, key: "0" },
  ])
