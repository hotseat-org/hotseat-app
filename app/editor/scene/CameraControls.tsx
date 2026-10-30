import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, type RefObject } from "react"
import { OrthographicCamera, Vector3 } from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { CURSORS, type CursorHint } from "../cursors"
import { isTypingTarget } from "../keyboard"
import { createWheelReader, getSmoothZoomFactor, getStepZoomFactor } from "../wheel"

const PAN_KEYS: Record<string, true> = { w: true, a: true, s: true, d: true }
const ORBIT_KEYS: Record<string, true> = { q: true, e: true }
const ZOOM_KEYS: Record<string, number> = { "+": 1.25, "=": 1.25, "-": 1 / 1.25, _: 1 / 1.25 }
const UP = new Vector3(0, 1, 0)
/** Q/E orbit speed (rad/s). */
const ORBIT_SPEED = 1.8
/** ⌥ + scroll orbit (rad per px scrolled). */
const SCROLL_ORBIT = 0.006
/** Pointer travel (px) before a floor drag pans rather than clicks. */
const DRAG_THRESHOLD = 4

/** Camera gestures with their own cursor, most important first. */
const GESTURES = ["orbit", "panning", "zoomIn", "zoomOut", "pan"] as const
type Gesture = (typeof GESTURES)[number]
/** What can hold a gesture's cursor on: a held mouse button, a left-drag pan, keys, Space. */
type GestureSource = "button" | "drag" | "keys" | "space"
/** How long a one-off gesture (a wheel step, a zoom key) keeps its cursor (ms). */
const FLASH_DURATION = 350

/** Lets Scene start a pan from a press on bare floor (see the drag effect below). */
export interface FloorPan {
  start: (event: PointerEvent) => void
  /** Whether the latest drag panned — still true in its pointerup handlers. */
  hasMoved: () => boolean
}

interface Props {
  floorPan?: RefObject<FloorPan | null>
  /** Filled with the setter Scene hands to hovered pieces (CursorHintContext). */
  setCursorHint?: RefObject<((id: string, hint: CursorHint | null) => void) | null>
  /** The canvas cursor while no camera gesture is going on (the tool's). */
  cursor: string
  /** Hovered pieces may show their hint over `cursor` (not while carrying one). */
  isHintShown?: boolean
  /** Display mode: OrbitControls pans on left-drag too. */
  readOnly?: boolean
}

/**
 * Camera input on top of OrbitControls' drags (right-drag orbits, middle-drag
 * pans), for mouse and trackpad alike:
 * - wheel: a mouse notch, a two-finger trackpad scroll and a pinch all zoom
 *   toward the cursor; ⌥ + scroll orbits — see `createWheelReader`
 * - left-drag pans: on bare floor (Select / furniture tools), or anywhere with
 *   Space held (wall tools draw with the left button)
 * - keys: W A S D pan, Q / E orbit, + / − zoom
 * Pans move the camera and the orbit target together along the ground plane.
 * Owns the canvas cursor too: the tool's, or the running gesture's.
 */
export const CameraControls = ({
  floorPan,
  setCursorHint,
  cursor,
  isHintShown = true,
  readOnly = false,
}: Props) => {
  const camera = useThree((state) => state.camera) as OrthographicCamera
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const keys = useRef<Set<string>>(new Set())

  const forward = useRef(new Vector3())
  const right = useRef(new Vector3())
  const move = useRef(new Vector3())

  // --- Cursor ---------------------------------------------------------------
  const cursorState = useRef({
    base: cursor,
    isHintShown,
    hints: new Map<string, CursorHint>(),
    held: {} as Partial<Record<GestureSource, Gesture>>,
    flash: null as Gesture | null,
    flashTimer: 0,
  })
  const applyCursor = () => {
    const { base, isHintShown, hints, held, flash } = cursorState.current
    const heldGestures = Object.values(held)
    const gesture = GESTURES.find((candidate) => heldGestures.includes(candidate)) ?? flash
    const hint = isHintShown ? hints.values().next().value : undefined
    renderer.domElement.style.cursor = gesture ? CURSORS[gesture] : hint ? CURSORS[hint] : base
  }
  const setHeldGesture = (source: GestureSource, gesture: Gesture | null) => {
    const { held } = cursorState.current
    if ((held[source] ?? null) === gesture) return
    if (gesture) held[source] = gesture
    else delete held[source]

    applyCursor()
  }
  const flashGesture = (gesture: Gesture) => {
    const state = cursorState.current
    window.clearTimeout(state.flashTimer)
    state.flash = gesture
    applyCursor()
    state.flashTimer = window.setTimeout(() => {
      state.flash = null
      applyCursor()
    }, FLASH_DURATION)
  }
  useEffect(() => {
    cursorState.current.base = cursor
    cursorState.current.isHintShown = isHintShown
    applyCursor()
  })
  // Registered once, not per render: a hover that ends in the same commit as
  // a re-render here would otherwise call it while unset, and the hint stuck.
  useEffect(() => {
    if (!setCursorHint) return

    const { hints } = cursorState.current
    setCursorHint.current = (id, hint) => {
      if (hint) hints.set(id, hint)
      else hints.delete(id)

      actions.current.applyCursor()
    }

    return () => {
      setCursorHint.current = null
      hints.clear()
    }
  }, [setCursorHint])
  useEffect(() => {
    const element = renderer.domElement
    const state = cursorState.current

    return () => {
      window.clearTimeout(state.flashTimer)
      element.style.cursor = ""
    }
  }, [renderer])

  // --- Camera moves ---------------------------------------------------------
  /** Camera forward/right, flattened onto the ground. False when looking straight down. */
  const setGroundAxes = () => {
    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    if (forward.current.lengthSq() < 1e-6) return false

    forward.current.normalize()
    right.current.crossVectors(forward.current, UP).normalize()

    return true
  }

  /** Pans so the ground follows the pointer: (dx, dy) screen px, + = right / down. */
  const panByPixels = (deltaX: number, deltaY: number) => {
    if (!controls || !setGroundAxes()) return

    const worldPerPixel =
      (camera.top - camera.bottom) / camera.zoom / renderer.domElement.clientHeight
    // Ground depth is foreshortened on screen by the camera's tilt.
    const screenUp = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    const tilt = Math.max(0.2, forward.current.dot(screenUp))
    move.current
      .copy(right.current)
      .multiplyScalar(deltaX * worldPerPixel)
      .addScaledVector(forward.current, (-deltaY * worldPerPixel) / tilt)
    camera.position.add(move.current)
    controls.target.add(move.current)
    invalidate()
  }

  /** Zooms by `factor`, keeping the ground under (x, y) — canvas px — in place. */
  const zoomAt = (factor: number, x?: number, y?: number) => {
    if (!controls) return

    flashGesture(factor > 1 ? "zoomIn" : "zoomOut")
    const prevZoom = camera.zoom
    camera.zoom = Math.min(controls.maxZoom, Math.max(controls.minZoom, prevZoom * factor))
    camera.updateProjectionMatrix()
    const applied = camera.zoom / prevZoom
    if (x !== undefined && y !== undefined) {
      const { clientWidth, clientHeight } = renderer.domElement
      panByPixels((x - clientWidth / 2) * (applied - 1), (y - clientHeight / 2) * (applied - 1))
    }

    invalidate()
  }

  /** Orbits around the target; + turns the scene clockwise (seen from above). */
  const orbit = (angle: number) => {
    if (!controls) return

    move.current.subVectors(camera.position, controls.target).applyAxisAngle(UP, angle)
    camera.position.copy(controls.target).add(move.current)
    camera.lookAt(controls.target)
    invalidate()
  }

  // The latest closures for the listeners below (they're attached once).
  const actions = useRef({ panByPixels, zoomAt, orbit, setHeldGesture, flashGesture, applyCursor })
  actions.current = { panByPixels, zoomAt, orbit, setHeldGesture, flashGesture, applyCursor }

  // Keys: held W A S D / Q E move in useFrame; + / − zoom a step per press.
  useEffect(() => {
    const setOrbitCursor = () =>
      actions.current.setHeldGesture(
        "keys",
        keys.current.has("q") || keys.current.has("e") ? "orbit" : null
      )
    const down = (event: KeyboardEvent) => {
      // Not while typing, and not with modifiers: on macOS the keyup of a key
      // released while ⌘ is held never fires, so ⌘+A/⌘+S would pan forever.
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return

      const zoomFactor = ZOOM_KEYS[event.key]
      if (zoomFactor) return actions.current.zoomAt(zoomFactor)

      const key = event.key.toLowerCase()
      if (!PAN_KEYS[key] && !ORBIT_KEYS[key]) return

      keys.current.add(key)
      setOrbitCursor()
      invalidate() // frameloop="demand": start the render loop for the move
    }
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.key.toLowerCase())
      setOrbitCursor()
    }
    const clear = () => {
      keys.current.clear()
      setOrbitCursor()
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", clear)

    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", clear)
    }
  }, [invalidate])

  // Wheel: handled here instead of by OrbitControls (it zooms on every wheel
  // event). Capturing runs first on the canvas, so the event can be stopped
  // before OrbitControls' listener — whose touch pinch-zoom stays on.
  useEffect(() => {
    const element = renderer.domElement
    const readWheel = createWheelReader()
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      const { zoomAt, orbit, flashGesture } = actions.current
      const intent = readWheel(event)
      if (intent === "rotate") {
        flashGesture("orbit")

        return orbit((event.deltaX || event.deltaY) * SCROLL_ORBIT)
      }
      // A purely sideways scroll has nothing to zoom by.
      if (event.deltaY === 0) return

      const factor =
        intent === "smoothZoom"
          ? getSmoothZoomFactor(event.deltaY)
          : getStepZoomFactor(event.deltaY)
      zoomAt(factor, event.offsetX, event.offsetY)
    }
    element.addEventListener("wheel", onWheel, { capture: true, passive: false })

    return () => element.removeEventListener("wheel", onWheel, { capture: true })
  }, [renderer])

  // OrbitControls' own drags, for the cursor only: right-drag orbits (with
  // Shift/⌘/Ctrl it pans), middle-drag pans, and in display mode so does a
  // left-drag — once it moves, so a click on a desk stays a plain click.
  useEffect(() => {
    const element = renderer.domElement
    let leftStart: { x: number; y: number } | null = null
    const onPointerDown = (event: PointerEvent) => {
      const { setHeldGesture } = actions.current
      if (event.button === 2) {
        setHeldGesture(
          "button",
          event.shiftKey || event.ctrlKey || event.metaKey ? "panning" : "orbit"
        )
      } else if (event.button === 1) setHeldGesture("button", "panning")
      else if (event.button === 0 && readOnly) leftStart = { x: event.clientX, y: event.clientY }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!leftStart) return
      if (Math.hypot(event.clientX - leftStart.x, event.clientY - leftStart.y) <= DRAG_THRESHOLD)
        return

      actions.current.setHeldGesture("button", "panning")
    }
    const onPointerUp = () => {
      leftStart = null
      actions.current.setHeldGesture("button", null)
    }
    element.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("blur", onPointerUp)

    return () => {
      element.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("blur", onPointerUp)
    }
  }, [renderer, readOnly])

  // Left-drag panning, two ways in:
  // - Space + drag: caught on the window before the canvas sees it, so the
  //   build tools (and OrbitControls) never get that press;
  // - a drag on bare floor, started by Scene through `floorPan` (Select and
  //   furniture tools). That press still reaches the tools; the drag only pans
  //   once it travels past DRAG_THRESHOLD, and `hasMoved` tells a click from a pan.
  useEffect(() => {
    const element = renderer.domElement
    let isSpaceHeld = false
    let drag: { x: number; y: number; startX: number; startY: number; isSpace: boolean } | null =
      null
    let hasMoved = false
    const setDragCursor = () => {
      const { setHeldGesture } = actions.current
      setHeldGesture("space", isSpaceHeld ? "pan" : null)
      setHeldGesture("drag", drag && hasMoved ? "panning" : null)
    }
    const startDrag = (event: PointerEvent, isSpace: boolean) => {
      drag = {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        isSpace,
      }
      hasMoved = isSpace
      setDragCursor()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTypingTarget(event.target)) return

      event.preventDefault() // no page scroll, no pressing a focused button
      isSpaceHeld = true
      setDragCursor()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      if (!isTypingTarget(event.target)) event.preventDefault()

      isSpaceHeld = false
      setDragCursor()
    }
    const onBlur = () => {
      isSpaceHeld = false
      drag = null
      setDragCursor()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!isSpaceHeld || event.button !== 0 || event.target !== element) return

      event.stopPropagation()
      event.preventDefault()
      startDrag(event, true)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return
      if (!hasMoved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <= DRAG_THRESHOLD)
          return

        hasMoved = true
        setDragCursor()
      }

      actions.current.panByPixels(drag.x - event.clientX, drag.y - event.clientY)
      drag.x = event.clientX
      drag.y = event.clientY
    }
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || event.button !== 0) return
      if (drag.isSpace) event.stopPropagation()

      drag = null
      setDragCursor()
    }

    if (floorPan) {
      floorPan.current = {
        start: (event) => startDrag(event, false),
        hasMoved: () => hasMoved,
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    window.addEventListener("pointerdown", onPointerDown, { capture: true })
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp, { capture: true })

    return () => {
      if (floorPan) floorPan.current = null

      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("pointerdown", onPointerDown, { capture: true })
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp, { capture: true })
    }
  }, [renderer, floorPan])

  useFrame((_, delta) => {
    if (!controls || keys.current.size === 0) return

    const turn = (keys.current.has("e") ? 1 : 0) - (keys.current.has("q") ? 1 : 0)
    if (turn) orbit(turn * ORBIT_SPEED * delta)

    if (!setGroundAxes()) return

    move.current.set(0, 0, 0)
    if (keys.current.has("w")) move.current.add(forward.current)
    if (keys.current.has("s")) move.current.sub(forward.current)
    if (keys.current.has("d")) move.current.add(right.current)
    if (keys.current.has("a")) move.current.sub(right.current)
    if (move.current.lengthSq() > 0) {
      const speed = (420 / camera.zoom) * delta
      move.current.normalize().multiplyScalar(speed)
      camera.position.add(move.current)
      controls.target.add(move.current)
    }

    invalidate() // keep rendering while a key is held
  })

  return null
}
