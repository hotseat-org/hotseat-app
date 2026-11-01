import { createContext, useContext } from "react"
import { DoubleSide } from "three"
import { useCutaway } from "../walls/cutaway"
import { STOREY } from "./dimensions"
import { useFloorPlace } from "./floorHeight"
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
   * Draw as if a hair behind anything exactly level with it — this many
   * depth steps (a depth bias). Walls 1: furniture stands flush against them,
   * and a face landing exactly on the wall's face (a shower's tiles) would
   * otherwise flicker (z-fighting). Posts 2: their faces lie on the walls'
   * own, which win.
   */
  recess?: number
}

/** Walls' depth step back (see SurfaceProps.recess). */
export const WALL_RECESS = 1
/** Posts': behind the walls their faces lie on. */
export const POST_RECESS = 2

/**
 * How far back a floor below is drawn, per storey under the shown one (depth
 * steps): past anything recessed on the floor above.
 */
const STOREY_RECESS = 3

/**
 * The depth push back (polygonOffset; ties only): the surface's own, and more
 * for each storey down — where a floor's walls reach into the tops of the
 * walls under them (their sink), the upper ones win, with no flicker and no
 * line where the storeys meet.
 */
const getDepthOffset = (ownRecess: number, base: number) => {
  const recess = ownRecess + Math.round(-base / STOREY) * STOREY_RECESS

  return recess > 0
    ? { polygonOffset: true, polygonOffsetFactor: recess, polygonOffsetUnits: recess }
    : {}
}

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
  recess = 0,
}: SurfaceProps) => {
  const ghost = useContext(GhostContext)
  const cutaway = useCutaway()
  const floorPlace = useFloorPlace()

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
      {...getDepthOffset(recess, floorPlace.base)}
      // Contact shading (by its height on its floor), and the wall cutaway when it's
      // sliced by one (inner faces then show where it's cut open) — see
      // surfaceShader.ts. The
      // cutaway's kind is marked, so the office-wide batch merges it with its like.
      {...getSurfaceShader(cutaway, floorPlace)}
      {...(cutaway && { side: DoubleSide, userData: { cutaway } })}
      // Never disposed with its piece: three.js frees a shader program once no
      // material uses it, so a floor's furniture going (another floor shown)
      // freed them all — and coming back compiled them all again, a stall
      // every switch. A material holds nothing on the GPU itself.
      dispose={null}
    />
  )
}
