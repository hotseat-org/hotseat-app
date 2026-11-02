import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useThree } from "@react-three/fiber"
import { DaylightContext } from "../lighting/daylight"
import { markShadowsDirty } from "../lighting/shadows"
import { whenQuiet } from "./whenQuiet"

/** How long after loading before warming up (ms): people start looking around then. */
const WARMUP_DELAY = 10_000

/** How dark it must be before lamps switch on (shared by every lamp). */
export const LAMPS_ON = 0.02

/**
 * While warming up: lamps show their lights in the other state than the time
 * of day says — on (at zero brightness) by day, off at night. Null otherwise.
 */
const WarmupContext = createContext<boolean | null>(null)

/**
 * Whether a lamp's light is mounted: on at dusk, or flipped while warming up.
 * A light coming or going changes what the cached shadow maps must hold — and
 * a shadow-casting light whose map was never drawn breaks every lit surface
 * (the GPU refuses to draw with a missing shadow map) — so it marks them dirty.
 */
export const useLampsOn = () => {
  const nightness = useContext(DaylightContext)
  const forced = useContext(WarmupContext)
  const isOn = forced ?? nightness > LAMPS_ON
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => markShadowsDirty(invalidate), [isOn, invalidate])

  return isOn
}

/**
 * Compiles the other time of day's shaders ahead of time. Lamp lights exist
 * only after dusk, and in three.js a change in the number of lights recompiles
 * every lit material — a long stall the moment the time slider crosses dusk
 * (worst on Windows, where browsers translate shaders for Direct3D). Well after
 * the office has loaded, when nobody's using it, with rendering paused, the
 * lamps flip to the other state while three.js compiles those variants in the
 * background (in parallel where the browser can); each material keeps every
 * variant it has compiled, so crossing dusk later just switches.
 */
export const ShaderWarmup = ({ children }: { children: ReactNode }) => {
  const nightness = useContext(DaylightContext)
  const { gl: renderer, scene, camera, invalidate, get } = useThree()
  const setFrameloop = useThree((state) => state.setFrameloop)
  const [forced, setForced] = useState<boolean | null>(null)
  // The frame loop to go back to once the lamps are back (null: not paused).
  const pausedFrameloop = useRef<ReturnType<typeof get>["frameloop"] | null>(null)

  // Once, well after the office has loaded (people start looking around
  // then), when nobody's using it. Rendering pauses *before* the lamps flip:
  // a frame drawn with them flipped would build every lit material for it
  // there and then, stalling the page.
  useEffect(() => {
    let cancelQuiet = () => {}
    const timer = window.setTimeout(() => {
      cancelQuiet = whenQuiet(() => {
        pausedFrameloop.current = get().frameloop
        setFrameloop("never")
        setForced(!(nightness > LAMPS_ON))
      })
    }, WARMUP_DELAY)

    return () => {
      window.clearTimeout(timer)
      cancelQuiet()
    }
    // Only the time of day at load decides which way to warm up.
  }, [])

  // The lamps have flipped (this commit): compile, then put them back.
  useEffect(() => {
    if (forced === null) return

    let isDone = false
    renderer
      .compileAsync(scene, camera)
      .catch(() => {}) // A failed warm-up just means compiling later, as before.
      .finally(() => {
        if (isDone) return

        isDone = true
        setForced(null)
      })

    return () => {
      isDone = true
    }
  }, [forced, renderer, scene, camera])

  // The lamps are back (this commit): rendering resumes — not before, or a
  // frame would draw them still flipped. Their shadows are drawn afresh.
  useEffect(() => {
    if (forced !== null || pausedFrameloop.current === null) return

    setFrameloop(pausedFrameloop.current)
    pausedFrameloop.current = null
    markShadowsDirty(invalidate)
  }, [forced, setFrameloop, invalidate])

  // Left mid-way (unmounted): don't leave rendering paused.
  useEffect(
    () => () => {
      if (pausedFrameloop.current !== null) setFrameloop(pausedFrameloop.current)
    },
    [setFrameloop]
  )

  return <WarmupContext.Provider value={forced}>{children}</WarmupContext.Provider>
}
