import { memo, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import type { Group } from "three"
import {
  FOOTPRINT_CELLS,
  GRID,
  isEdgeType,
  isOpening,
  isOverhead,
  isSeatable,
  isWallMounted,
  variantOf,
  type SceneObject,
  type Tool,
} from "../types"
import { GhostObject } from "../scene/GhostObject"
import { edgeLength, edgeStretch } from "../layout"
import { markShadowsDirty } from "../scene/shadows"
import { CutawayContext } from "../scene/cutaway"
import { CursorHintContext } from "../cursors"
import { ObjectMesh } from "./ObjectMesh"
import { WALL } from "./dimensions"
import { FootprintOutline } from "./FootprintOutline"
import { Baked } from "./Baked"

const ERASE = "#ef4444"

interface Props {
  obj: SceneObject
  selected: boolean
  tool: Tool
  /** Display mode passes false to make the object inert. */
  interactive?: boolean
  /** True while this object is being carried (picked up to move). */
  carried?: boolean
  /** When a drop was last refused (performance.now()) — shake "no". */
  blockedAt?: number
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  /** A press on furniture (Select tool): a drag from here moves it. */
  onStartDrag: (id: string, e: ThreeEvent<PointerEvent>) => void
  /** View mode: clicked a desk (opens its seat card). */
  onSeatClick?: (id: string) => void
  /** Shift-click: toggle this piece in the multi-selection. */
  onToggleSelect?: (id: string) => void
  /** Lift a door/window to move it along the walls. */
  onPickOpening?: (id: string) => void
  /** Desks in view mode: whether someone sits here on the shown day. */
  occupied?: boolean
}

const isFurniture = (o: SceneObject) => !isEdgeType(o.type)
/** Seconds for a rotation to swing round (with a little overshoot). */
const TURN = 0.2
const TAU = Math.PI * 2
/** Ease-out with a slight overshoot, so a turn lands with a snap. */
const snapEase = (t: number) => {
  const c = 1.2
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}
/** Duration (s) of the refused-drop shake. */
const SHAKE = 0.35

/**
 * One placed piece. Memoized: moving or editing one piece mustn't re-render
 * every other piece in the office (the scene passes stable callbacks).
 */
export const ObjectRenderer = memo(function ObjectRenderer({
  obj,
  selected,
  tool,
  interactive = true,
  carried = false,
  blockedAt = 0,
  onSelect,
  onDelete,
  onStartDrag,
  onPickOpening,
  onToggleSelect,
  onSeatClick,
  occupied,
}: Props) {
  const [hovered, setHovered] = useState(false)
  // View mode: desks are clickable (seat card).
  const clickable = !interactive && !!onSeatClick && isSeatable(obj.type)
  // Edit mode: with the Select tool, everything that renders here (furniture,
  // doors, windows) can be clicked/picked up.
  const selectable = interactive && tool === "select" && !carried
  // Same hover language in both modes: a hand cursor + footprint outline —
  // open (pick it up) in edit mode, pointing (open its card) in view mode.
  const hoverable = clickable || selectable
  const setCursorHint = useContext(CursorHintContext)
  useEffect(() => {
    if (!hoverable || !hovered) return
    setCursorHint(obj.id, selectable ? "grab" : "point")
    return () => setCursorHint(obj.id, null)
  }, [hoverable, hovered, selectable, obj.id, setCursorHint])
  // Doors, windows and wall items are sliced with their wall by the cursor
  // cutaway (see cutaway.ts).
  const cutaway = isOpening(obj.type) ? "wall" : isWallMounted(obj.type) ? "item" : null

  // Rotation swings round quickly instead of jumping: the group's angle is
  // driven here (not as a prop), easing along the shortest way to the target.
  const invalidate = useThree((s) => s.invalidate)
  const turned = useRef<Group>(null)
  const turn = useRef<{ from: number; to: number; t: number } | null>(null)
  const angle = useRef(obj.rotation)
  useLayoutEffect(() => {
    const g = turned.current
    if (!g) return
    const target = obj.rotation
    const cur = angle.current
    // Shortest signed difference (a turn from 270° to 0° goes +90°, not −270°).
    const d = ((((target - cur) % TAU) + TAU * 1.5) % TAU) - TAU / 2
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (Math.abs(d) < 1e-4 || still) {
      turn.current = null
      angle.current = target
      g.rotation.y = target
      return
    }
    turn.current = { from: cur, to: cur + d, t: 0 }
    invalidate()
  }, [obj.rotation, invalidate])

  // "Grabbed" animation: lift + tilt (as if hoisted by a corner) + gentle sway.
  const lifted = useRef<Group>(null)
  const amt = useRef(0)
  useFrame((state, delta) => {
    const r = turn.current
    const tg = turned.current
    if (r && tg) {
      r.t = Math.min(1, r.t + Math.min(delta, 0.05) / TURN)
      angle.current = r.from + (r.to - r.from) * snapEase(r.t)
      tg.rotation.y = angle.current
      if (r.t >= 1) {
        turn.current = null
        angle.current = obj.rotation
        tg.rotation.y = obj.rotation
      }
      markShadowsDirty(state.gl, state.invalidate) // shadows turn with it
    }
  })
  useFrame((state, delta) => {
    const g = lifted.current
    if (!g) return
    const prev = amt.current
    const target = carried ? 1 : 0
    amt.current += (target - amt.current) * Math.min(1, delta * 12)
    const a = amt.current
    if (a < 0.0005 && target === 0) {
      if (prev !== 0) {
        g.position.set(0, 0, 0)
        g.rotation.set(0, 0, 0)
        markShadowsDirty(state.gl, state.invalidate) // settled back down
      }
      amt.current = 0
      return
    }
    const t = state.clock.elapsedTime
    const sway = Math.sin(t * 2.4) * 0.05
    g.position.y = a * (0.34 + Math.sin(t * 3.1) * 0.03)
    g.rotation.x = a * (0.15 + sway * 0.5)
    g.rotation.z = a * (-0.15 + sway)
    // Refused drop: a quick side-to-side "no" shake that decays.
    const since = (performance.now() - blockedAt) / 1000
    g.position.x = since < SHAKE ? Math.sin(since * 70) * 0.08 * (1 - since / SHAKE) : 0
    // Keep the render loop alive while animating (frameloop is "demand"). The
    // cached shadows follow the lift itself, not the idle sway — a per-frame
    // shadow redraw while carrying would double the draw calls.
    if (Math.abs(target - a) > 0.01) markShadowsDirty(state.gl, state.invalidate)
    else state.invalidate()
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    if (tool === "delete") {
      // Walls/doors are erased by BuildController (single click or drag-run);
      // here we only handle single-click deletion of furniture.
      if (!isFurniture(obj)) return
      e.stopPropagation()
      onDelete(obj.id)
      return
    }
    if (tool === "select") {
      e.stopPropagation()
      // Doors/windows move along walls (lifted out, carried, re-cut on drop);
      // furniture is carried across the floor.
      if (isOpening(obj.type) && onPickOpening) return onPickOpening(obj.id)
      // Shift-click: add/remove to the multi-selection (no pick-up).
      if (e.shiftKey && isFurniture(obj) && onToggleSelect) return onToggleSelect(obj.id)
      onSelect(obj.id)
      if (isFurniture(obj)) onStartDrag(obj.id, e)
    }
    // Other build tools fall through so placement can read the ground beneath.
  }

  // Outline size: a footprint for furniture; the wall segment for doors/windows.
  const outline: [number, number] = isEdgeType(obj.type)
    ? [edgeLength(obj), WALL.depth + 0.2]
    : [FOOTPRINT_CELLS[obj.type][0] * GRID, FOOTPRINT_CELLS[obj.type][1] * GRID]
  // Red preview when this piece of furniture is about to be erased.
  const showErase = interactive && tool === "delete" && hovered && isFurniture(obj)

  return (
    <group
      ref={turned}
      position={[obj.x, 0, obj.z]}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerOver={
        interactive || clickable
          ? (e) => {
              // Only claim the pointer when this piece reacts to it (select,
              // erase, a desk in view mode); with a build tool armed the floor
              // keeps tracking, so the placement preview stays up (red) here.
              if (hoverable || tool === "delete") e.stopPropagation()
              setHovered(true)
            }
          : undefined
      }
      onPointerOut={interactive || clickable ? () => setHovered(false) : undefined}
      // View mode: desks are clickable (seat card). A drag (camera pan) isn't
      // a click — R3F's `delta` is the pointer travel in px.
      onClick={
        clickable && onSeatClick
          ? (e) => {
              if (e.delta > 4) return
              e.stopPropagation()
              onSeatClick(obj.id)
            }
          : undefined
      }
    >
      {/* Lifted/tilted while carried (the placement highlight marks the drop spot). */}
      {/* A diagonal door/window is longer than a straight one. */}
      <group ref={lifted} scale={edgeStretch(obj.type, obj.rotation)}>
        <CutawayContext.Provider value={cutaway}>
          {/* Batched: the object's parts merge into one mesh per material — and,
              viewing, with the whole office's. */}
          <Baked isBatchable>
            <ObjectMesh
              type={obj.type}
              color={obj.color}
              model={obj.model}
              variant={variantOf(obj)}
              occupied={occupied}
            />
          </Baked>
        </CutawayContext.Provider>
        {showErase && <GhostObject type={obj.type} tint={ERASE} scale={1.06} />}
      </group>
      {/* The whole footprint is clickable, not just the mesh: an invisible
          floor plane over its grid squares. Rugs sit a hair lower so what
          stands on them wins; overhead and wall items have furniture under
          their footprint, so they're picked by their mesh only. */}
      {isFurniture(obj) && !isOverhead(obj.type) && !isWallMounted(obj.type) && (
        <mesh
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          // Above a rug's own surface (y ≈ 0.014), so a piece on a rug wins there.
          position={[0, obj.type === "rug" ? 0.006 : 0.02, 0]}
        >
          <planeGeometry args={outline} />
          <meshBasicMaterial />
        </mesh>
      )}
      <FootprintOutline
        width={outline[0]}
        depth={outline[1]}
        hovered={hoverable && hovered}
        selected={selected && !carried}
      />
    </group>
  )
})
