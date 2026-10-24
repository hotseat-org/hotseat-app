import { createContext, useContext } from "react"
import { DoubleSide } from "three"
import { useCutaway } from "../scene/cutaway"
import { getSurfaceShader } from "./surfaceShader"

/**
 * How the surrounding subtree should render its materials:
 * - null         → normal solid object
 * - "translucent"→ real colours, semi-transparent (build ghost)
 * - { tint }     → flat unlit tint, semi-transparent (erase ghost)
 */
export type GhostMode = null | "translucent" | { tint: string }

export const GhostContext = createContext<GhostMode>(null)

interface SurfaceProps {
  color: string
  roughness?: number
  metalness?: number
  flatShading?: boolean
  /** Glow colour (a screen, a bulb). */
  emissive?: string
  emissiveIntensity?: number
  /** Base opacity (<1 = see-through, e.g. window glass). */
  opacity?: number
  /**
   * Draw as if a hair behind anything exactly level with it (a depth bias).
   * For walls: furniture stands flush against them, and a face landing exactly
   * on the wall's face (a shower's tiles) would otherwise flicker (z-fighting).
   */
  isRecessed?: boolean
}

/** polygonOffset pushes the depth back by about one depth step: ties only. */
const RECESSED = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }

/**
 * Drop-in replacement for <meshStandardMaterial> that becomes a translucent or
 * tinted ghost when rendered inside a GhostContext. Purely declarative — r3f
 * owns each material's lifecycle, so previews never mutate or dispose the
 * materials of real objects.
 */
export const Surface = ({
  color,
  roughness = 0.8,
  metalness = 0,
  flatShading,
  emissive,
  emissiveIntensity = 1,
  opacity: baseOpacity = 1,
  isRecessed = false,
}: SurfaceProps) => {
  const ghost = useContext(GhostContext)
  const cutaway = useCutaway()

  if (ghost && typeof ghost === "object") {
    return (
      <meshBasicMaterial
        color={ghost.tint}
        transparent
        opacity={0.5}
        depthWrite={false}
        toneMapped={false}
      />
    )
  }

  const translucent = ghost === "translucent" || baseOpacity < 1
  const opacity = (ghost === "translucent" ? 0.55 : 1) * baseOpacity
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      flatShading={flatShading}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
      transparent={translucent}
      opacity={translucent ? opacity : 1}
      depthWrite={!translucent}
      {...(isRecessed && RECESSED)}
      // Contact shading, and the wall cutaway when it's sliced by one (inner
      // faces then show where it's cut open) — see surfaceShader.ts. The
      // cutaway's kind is marked, so the office-wide batch merges it with its like.
      {...getSurfaceShader(cutaway)}
      {...(cutaway && { side: DoubleSide, userData: { cutaway } })}
    />
  )
}
