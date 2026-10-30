import { memo, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import type { Group } from "three"
import {
  GRID,
  isEdgeType,
  isOpening,
  isOverhead,
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
import { getItem } from "../catalog"
import { ObjectMesh } from "./ObjectMesh"
import { WALL } from "./dimensions"
import { FootprintOutline } from "./FootprintOutline"
import { Baked } from "./Baked"

const ERASE = "#ef4444"

interface Props {
  object: SceneObject
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
  onStartDrag: (id: string, event: ThreeEvent<PointerEvent>) => void
  /** View mode: clicked a desk (opens its seat card). */
  /** Viewing: what a click on this piece does (a module's — a desk opens its card). */
  onViewClick?: (id: string) => void
  /** Shift-click: toggle this piece in the multi-selection. */
  onToggleSelect?: (id: string) => void
  /** A right-press on furniture: the right-click menu, if it's let go in place. */
  onMenuPress?: (id: string, event: ThreeEvent<PointerEvent>) => void
  /** Lift a door/window to move it along the walls. */
  onPickOpening?: (id: string) => void
  /** Desks in view mode: whether someone sits here on the shown day. */
  occupied?: boolean
  /** Doors and windows: the paint of the wall they're cut into, each face. */
  wallFront?: string
  wallBack?: string
}

const isFurniture = (object: SceneObject) => !isEdgeType(object.type)
/** Seconds for a rotation to swing round (with a little overshoot). */
const TURN = 0.2
const TAU = Math.PI * 2
/** Ease-out with a slight overshoot, so a turn lands with a snap. */
const snapEase = (t: number) => {
  const overshoot = 1.2
  const offset = t - 1
  return 1 + (overshoot + 1) * offset * offset * offset + overshoot * offset * offset
}
/** Duration (s) of the refused-drop shake. */
const SHAKE = 0.35

/**
 * One placed piece. Memoized: moving or editing one piece mustn't re-render
 * every other piece in the office (the scene passes stable callbacks).
 */
export const ObjectRenderer = memo(function ObjectRenderer({
  object,
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
  onMenuPress,
  onViewClick,
  occupied,
  wallFront,
  wallBack,
}: Props) {
  const [hovered, setHovered] = useState(false)
  // View mode: desks are clickable (seat card).
  const clickable = !interactive && !!onViewClick
  // Edit mode: with the Select tool, everything that renders here (furniture,
  // doors, windows) can be clicked/picked up.
  const selectable = interactive && tool === "select" && !carried
  // Same hover language in both modes: a hand cursor + footprint outline —
  // open (pick it up) in edit mode, pointing (open its card) in view mode.
  const hoverable = clickable || selectable
  const setCursorHint = useContext(CursorHintContext)
  useEffect(() => {
    if (!hoverable || !hovered) return
    setCursorHint(object.id, selectable ? "grab" : "point")
    return () => setCursorHint(object.id, null)
  }, [hoverable, hovered, selectable, object.id, setCursorHint])
  // Doors, windows and wall items are sliced with their wall by the cursor
  // cutaway (see cutaway.ts).
  const cutaway = isOpening(object.type) ? "wall" : isWallMounted(object.type) ? "item" : null

  // Rotation swings round quickly instead of jumping: the group's angle is
  // driven here (not as a prop), easing along the shortest way to the target.
  const invalidate = useThree((state) => state.invalidate)
  const turned = useRef<Group>(null)
  const turn = useRef<{ from: number; to: number; t: number } | null>(null)
  const angle = useRef(object.rotation)
  useLayoutEffect(() => {
    const group = turned.current
    if (!group) return
    const target = object.rotation
    const currentAngle = angle.current
    // Shortest signed difference (a turn from 270° to 0° goes +90°, not −270°).
    const difference = ((((target - currentAngle) % TAU) + TAU * 1.5) % TAU) - TAU / 2
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (Math.abs(difference) < 1e-4 || still) {
      turn.current = null
      angle.current = target
      group.rotation.y = target
      return
    }
    turn.current = { from: currentAngle, to: currentAngle + difference, t: 0 }
    invalidate()
  }, [object.rotation, invalidate])

  // "Grabbed" animation: lift + tilt (as if hoisted by a corner) + gentle sway.
  const lifted = useRef<Group>(null)
  const amount = useRef(0)
  useFrame((state, delta) => {
    const swing = turn.current
    const turnedGroup = turned.current
    if (swing && turnedGroup) {
      swing.t = Math.min(1, swing.t + Math.min(delta, 0.05) / TURN)
      angle.current = swing.from + (swing.to - swing.from) * snapEase(swing.t)
      turnedGroup.rotation.y = angle.current
      if (swing.t >= 1) {
        turn.current = null
        angle.current = object.rotation
        turnedGroup.rotation.y = object.rotation
      }
      markShadowsDirty(state.gl, state.invalidate) // shadows turn with it
    }
  })
  useFrame((state, delta) => {
    const group = lifted.current
    if (!group) return
    const prev = amount.current
    const target = carried ? 1 : 0
    amount.current += (target - amount.current) * Math.min(1, delta * 12)
    const strength = amount.current
    if (strength < 0.0005 && target === 0) {
      if (prev !== 0) {
        group.position.set(0, 0, 0)
        group.rotation.set(0, 0, 0)
        markShadowsDirty(state.gl, state.invalidate) // settled back down
      }
      amount.current = 0
      return
    }
    const time = state.clock.elapsedTime
    const sway = Math.sin(time * 2.4) * 0.05
    group.position.y = strength * (0.34 + Math.sin(time * 3.1) * 0.03)
    group.rotation.x = strength * (0.15 + sway * 0.5)
    group.rotation.z = strength * (-0.15 + sway)
    // Refused drop: a quick side-to-side "no" shake that decays.
    const since = (performance.now() - blockedAt) / 1000
    group.position.x = since < SHAKE ? Math.sin(since * 70) * 0.08 * (1 - since / SHAKE) : 0
    // Keep the render loop alive while animating (frameloop is "demand"). The
    // cached shadows follow the lift itself, not the idle sway — a per-frame
    // shadow redraw while carrying would double the draw calls.
    if (Math.abs(target - strength) > 0.01) markShadowsDirty(state.gl, state.invalidate)
    else state.invalidate()
  })

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button === 2 && onMenuPress && isFurniture(object)) {
      event.stopPropagation() // the floor beneath would open its own menu
      return onMenuPress(object.id, event)
    }
    if (event.button !== 0) return
    if (tool === "delete") {
      // Walls/doors are erased by BuildController (single click or drag-run);
      // here we only handle single-click deletion of furniture.
      if (!isFurniture(object)) return
      event.stopPropagation()
      onDelete(object.id)
      return
    }
    if (tool === "select") {
      event.stopPropagation()
      // Doors/windows move along walls (lifted out, carried, re-cut on drop);
      // furniture is carried across the floor.
      if (isOpening(object.type) && onPickOpening) return onPickOpening(object.id)
      // Shift-click: add/remove to the multi-selection (no pick-up).
      if (event.shiftKey && isFurniture(object) && onToggleSelect) return onToggleSelect(object.id)
      onSelect(object.id)
      if (isFurniture(object)) onStartDrag(object.id, event)
    }
    // Other build tools fall through so placement can read the ground beneath.
  }

  // Outline size: a footprint for furniture; the wall segment for doors/windows.
  const outline: [number, number] = isEdgeType(object.type)
    ? [edgeLength(object), WALL.depth + 0.2]
    : [getItem(object.type).footprint[0] * GRID, getItem(object.type).footprint[1] * GRID]
  // Red preview when this piece of furniture is about to be erased.
  const showErase = interactive && tool === "delete" && hovered && isFurniture(object)

  return (
    <group
      ref={turned}
      position={[object.x, 0, object.z]}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerOver={
        interactive || clickable
          ? (event) => {
              // Only claim the pointer when this piece reacts to it (select,
              // erase, a desk in view mode); with a build tool armed the floor
              // keeps tracking, so the placement preview stays up (red) here.
              if (hoverable || tool === "delete") event.stopPropagation()
              setHovered(true)
            }
          : undefined
      }
      onPointerOut={interactive || clickable ? () => setHovered(false) : undefined}
      // View mode: desks are clickable (seat card). A drag (camera pan) isn't
      // a click — R3F's `delta` is the pointer travel in px.
      onClick={
        clickable && onViewClick
          ? (event) => {
              if (event.delta > 4) return
              event.stopPropagation()
              onViewClick(object.id)
            }
          : undefined
      }
    >
      {/* Lifted/tilted while carried (the placement highlight marks the drop spot). */}
      {/* A diagonal door/window is longer than a straight one. */}
      <group ref={lifted} scale={edgeStretch(object.type, object.rotation)}>
        <CutawayContext.Provider value={cutaway}>
          {/* Batched: the object's parts merge into one mesh per material — and,
              viewing, with the whole office's. */}
          <Baked isBatchable>
            <ObjectMesh
              type={object.type}
              color={object.color}
              wallFront={wallFront}
              wallBack={wallBack}
              model={object.model}
              variant={variantOf(object)}
              occupied={occupied}
            />
          </Baked>
        </CutawayContext.Provider>
        {showErase && <GhostObject type={object.type} tint={ERASE} scale={1.06} />}
      </group>
      {/* The whole footprint is clickable, not just the mesh: an invisible
          floor plane over its grid squares. Rugs sit a hair lower so what
          stands on them wins; overhead and wall items have furniture under
          their footprint, so they're picked by their mesh only. */}
      {isFurniture(object) && !isOverhead(object.type) && !isWallMounted(object.type) && (
        <mesh
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          // Above a rug's own surface (y ≈ 0.014), so a piece on a rug wins there.
          position={[0, getItem(object.type).isUnderlay ? 0.006 : 0.02, 0]}
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
