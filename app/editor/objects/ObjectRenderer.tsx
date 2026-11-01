import { memo, useLayoutEffect, useRef, useState } from "react"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { MathUtils, type BufferGeometry, type Group } from "three"
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
import { GhostObject } from "../building/GhostObject"
import { edgeLength, edgeStretch } from "../layout"
import { markShadowsDirty } from "../lighting/shadows"
import { CutawayContext } from "../walls/cutaway"
import { getItem } from "../catalog"
import { useHeldPiece } from "../store"
import { ObjectMesh } from "./ObjectMesh"
import { PieceContext } from "./pieceContext"
import { WALL } from "./dimensions"
import { PieceOutline } from "./PieceOutline"
import { usePieceHover } from "./usePieceHover"
import { Baked } from "./Baked"
import { composeHitShape } from "./hitShape"

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
/** A piece's hit box's height until its model is measured (m). */
const DEFAULT_HIT_HEIGHT = 0.8

/** Doors, windows and wall items are sliced with their wall by the cursor cutaway. */
const getCutaway = (type: SceneObject["type"]) => {
  if (isOpening(type)) return "wall"
  if (isWallMounted(type)) return "item"

  return null
}

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
  object: storedObject,
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
  // Carried, where it's held now (the layout has it where it stood).
  const object = useHeldPiece(storedObject)
  // What it's picked by, measured from its model (see composeHitShape).
  const [hitShape, setHitShape] = useState<BufferGeometry | null>(null)
  // View mode: desks are clickable (seat card).
  const clickable = !interactive && !!onViewClick
  // Edit mode: with the Select tool, everything that renders here (furniture,
  // doors, windows) can be clicked/picked up.
  const selectable = interactive && tool === "select" && !carried
  // Same hover language in both modes: a hand cursor + its outline — open
  // (pick it up) in edit mode, pointing (open its card) in view mode.
  const hoverable = clickable || selectable
  const getCursor = () => {
    if (!hoverable) return null

    return selectable ? "grab" : "point"
  }
  const {
    isHovered: hovered,
    isPointedAt,
    handleEnter,
    handleLeave,
  } = usePieceHover({
    id: object.id,
    cursor: getCursor(),
    isShared: clickable,
    isEditing: interactive,
  })
  // Doors, windows and wall items are sliced with their wall by the cursor
  // cutaway (see cutaway.ts).
  const cutaway = getCutaway(object.type)

  // Turning, lifted or settling back down: drawn by itself, out of the
  // office-wide batch (that holds only pieces standing still, see StaticBatch).
  const [isMoving, setIsMoving] = useState(false)

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
    setIsMoving(true)
    invalidate()
  }, [object.rotation, invalidate])

  // "Grabbed" animation: lift + tilt (as if hoisted by a corner) + gentle sway.
  const lifted = useRef<Group>(null)
  // Outline size: a footprint for furniture; the wall segment for doors/windows.
  const outline: [number, number] = isEdgeType(object.type)
    ? [edgeLength(object), WALL.depth + 0.2]
    : [getItem(object.type).footprint[0] * GRID, getItem(object.type).footprint[1] * GRID]
  const [outlineWidth, outlineDepth] = outline
  // Measured in its own frame, so a floor gliding to another doesn't skew it.
  useLayoutEffect(() => {
    const model = lifted.current
    const frame = turned.current
    if (!model || !frame || carried) return

    const shape = composeHitShape(model, frame, [outlineWidth, outlineDepth])
    if (!shape) return

    setHitShape(shape)

    return () => shape.dispose()
  }, [object.type, object.model, object.variant, carried, outlineWidth, outlineDepth])
  const amount = useRef(0)
  useFrame((state, delta) => {
    const swing = turn.current
    const turnedGroup = turned.current
    if (swing && turnedGroup) {
      swing.t = Math.min(1, swing.t + Math.min(delta, 0.05) / TURN)
      angle.current = MathUtils.lerp(swing.from, swing.to, snapEase(swing.t))
      turnedGroup.rotation.y = angle.current
      if (swing.t >= 1) {
        turn.current = null
        angle.current = object.rotation
        turnedGroup.rotation.y = object.rotation
      }

      markShadowsDirty(state.invalidate) // shadows turn with it
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
        markShadowsDirty(state.invalidate) // settled back down
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
    if (Math.abs(target - strength) > 0.01) markShadowsDirty(state.invalidate)
    else state.invalidate()
  })

  useFrame(() => {
    const isStill = !turn.current && amount.current === 0
    if (isStill === isMoving) setIsMoving(!isStill)
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

  const isUnderlay = getItem(object.type).isUnderlay
  // Pointed at (here, or at its tag or deskmate), or selected: outlined.
  const isOutlined = isPointedAt
  const isSelectedShown = selected && !carried
  const [hasOutline, setHasOutline] = useState(false)
  if ((isOutlined || isSelectedShown) && !hasOutline) setHasOutline(true)

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
            }
          : undefined
      }
      // Into and out of the piece as a whole (see usePieceHover).
      onPointerEnter={interactive || clickable ? handleEnter : undefined}
      onPointerLeave={interactive || clickable ? handleLeave : undefined}
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
          <Baked isBatchable={!carried && !isMoving}>
            <PieceContext.Provider value={object}>
              <ObjectMesh
                type={object.type}
                color={object.color}
                wallFront={wallFront}
                wallBack={wallBack}
                model={object.model}
                variant={variantOf(object)}
                occupied={occupied}
              />
            </PieceContext.Provider>
          </Baked>
        </CutawayContext.Provider>
        {showErase && <GhostObject type={object.type} tint={ERASE} scale={1.06} />}
        {/* Round its own shape, lifted and tilted with it — traced once it's first needed. */}
        {hasOutline && (
          <PieceOutline
            shapeKey={[object.type, object.model, object.variant].join("/")}
            hovered={isOutlined}
            selected={isSelectedShown}
          />
        )}
      </group>
      {/* The whole piece is clickable, not just its mesh: invisible columns
          under its parts, so the pointer can't slip between a desk's legs to
          the desk behind (a box over the footprint until it's measured). Rugs:
          a plane a hair over the floor, so what stands on them wins. Overhead
          and wall items have furniture under their footprint, so they're
          picked by their mesh only. */}
      {isFurniture(object) && !isOverhead(object.type) && !isWallMounted(object.type) && (
        <HitShape shape={isUnderlay ? null : hitShape} outline={outline} isUnderlay={isUnderlay} />
      )}
    </group>
  )
})

/** What a piece is picked by: its measured shape, or a stand-in over its footprint. */
const HitShape = ({
  shape,
  outline,
  isUnderlay,
}: {
  shape: BufferGeometry | null
  outline: [number, number]
  isUnderlay?: boolean
}) => {
  if (shape)
    return (
      <mesh visible={false} geometry={shape}>
        <meshBasicMaterial />
      </mesh>
    )

  if (isUnderlay)
    return (
      <mesh visible={false} position-y={0.006} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={outline} />
        <meshBasicMaterial />
      </mesh>
    )

  return (
    <mesh visible={false} position-y={DEFAULT_HIT_HEIGHT / 2}>
      <boxGeometry args={[outline[0], DEFAULT_HIT_HEIGHT, outline[1]]} />
      <meshBasicMaterial />
    </mesh>
  )
}
