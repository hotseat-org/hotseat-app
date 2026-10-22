import { createContext, useContext, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { DoubleSide, Plane, Vector3 } from "three"
import { WALL } from "./dimensions"

/**
 * How the surrounding subtree should render its materials:
 * - null         → normal solid object
 * - "translucent"→ real colours, semi-transparent (build ghost)
 * - { tint }     → flat unlit tint, semi-transparent (erase ghost)
 * - { xray }     → real, solid material, sliced down by `xray()` (0 = full
 *                  height, 1 = cut to a stub) — the animated wall cutaway
 */
export type GhostMode =
  | null
  | "translucent"
  | { tint: string }
  | { xray: () => number; ramp?: XrayRamp }

/**
 * A sloped cut for one wall segment: instead of one flat height, the cut runs
 * from its depth at `from` to its depth at `to` (world coords along `axis`),
 * so neighbouring segments join into one smooth curve instead of steps.
 */
export interface XrayRamp {
  axis: "x" | "z"
  from: number
  to: number
  /** Cut depth (0…1) at `from` and at `to`, read every frame. */
  ends: () => [number, number]
}

/** Sims-style cutaway: fully x-rayed walls are sliced down to this height. */
const CUT_HEIGHT = 0.3
/** Clip height when not faded — safely above everything wall-mounted. */
const CUT_TOP = WALL.height + 0.5

export const GhostContext = createContext<GhostMode>(null)

interface SurfaceProps {
  color: string
  roughness?: number
  metalness?: number
  flatShading?: boolean
  /** Neon glow colour (picked up by Bloom). */
  emissive?: string
  emissiveIntensity?: number
  /** Base opacity (<1 = see-through, e.g. window glass). */
  opacity?: number
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
}: SurfaceProps) => {
  const ghost = useContext(GhostContext)

  if (ghost && typeof ghost === "object" && "xray" in ghost) {
    return (
      <XraySurface
        fade={ghost.xray}
        ramp={ghost.ramp}
        color={color}
        roughness={roughness}
        metalness={metalness}
        flatShading={flatShading}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        opacity={baseOpacity}
      />
    )
  }

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
    />
  )
}

/**
 * A solid lit surface sliced down to a low stub by a horizontal clipping plane
 * that follows `fade()` every frame (set on the plane directly — no React
 * re-render), so the Sims-style "walls cut away" eases in and out. The plane is
 * world-space, so doors/windows/posts cut cleanly at the same height. (Shadows
 * aren't clipped: they're cached and redrawn only on scene changes — see
 * scene/shadows.ts — so the cutaway never triggers the expensive shadow pass.)
 * Double-sided so the sliced-open top shows the inner faces and reads as a
 * solid cut.
 * The material is never disposed: three.js deletes a shader program once no
 * material uses it, so every new cutaway would compile it again (a hitch per
 * cut — long ones in Firefox). Undisposed, the few programs stay warm; the
 * material objects themselves are still garbage-collected.
 */
const XraySurface = ({
  fade,
  color,
  roughness,
  metalness,
  flatShading,
  emissive,
  emissiveIntensity = 1,
  opacity: baseOpacity = 1,
  ramp,
}: SurfaceProps & { fade: () => number; ramp?: XrayRamp }) => {
  // Keeps what's below the plane (normal · p + constant ≥ 0): flat, y ≤ height;
  // or sloped between the heights at the ramp's two ends.
  const plane = useMemo(() => new Plane(new Vector3(0, -1, 0), CUT_TOP), [])
  const heightAt = (f: number) => CUT_TOP + (CUT_HEIGHT - CUT_TOP) * f
  const apply = () => {
    if (!ramp) {
      plane.normal.set(0, -1, 0)
      plane.constant = heightAt(fade())
      return
    }
    const [f0, f1] = ramp.ends()
    const h0 = heightAt(f0)
    const k = (heightAt(f1) - h0) / (ramp.to - ramp.from) // rise per unit along the wall
    // y ≤ h0 + k (s − from)  ⇔  k·s − y + (h0 − k·from) ≥ 0, then normalised.
    const len = Math.hypot(k, 1)
    plane.normal.set(ramp.axis === "x" ? k / len : 0, -1 / len, ramp.axis === "z" ? k / len : 0)
    plane.constant = (h0 - k * ramp.from) / len
  }
  apply()
  useFrame(apply)
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      flatShading={flatShading}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? emissiveIntensity : 0}
      // Solid (only glass keeps its own see-through opacity).
      transparent={baseOpacity < 1}
      opacity={baseOpacity}
      depthWrite={baseOpacity >= 1}
      side={DoubleSide}
      clippingPlanes={[plane]}
      dispose={null}
    />
  )
}
