import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react"
import { useThree } from "@react-three/fiber"
import { DaylightContext } from "../daylight"
import { markShadowsDirty } from "./shadows"

/** How dark it must be before lamps switch on (shared by every lamp). */
export const LAMPS_ON = 0.02
/** Wait for the office to load and settle before warming up (ms). */
const DELAY = 1200

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
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => markShadowsDirty(renderer, invalidate), [isOn, renderer, invalidate])

  return isOn
}

/**
 * Compiles the other time of day's shaders ahead of time. Lamp lights exist
 * only after dusk, and in three.js a change in the number of lights recompiles
 * every lit material — a long stall the moment the time slider crosses dusk
 * (worst on Windows, where browsers translate shaders for Direct3D). Shortly
 * after the office loads, with rendering paused, the lamps flip to the other
 * state while three.js compiles those variants in the background (in parallel
 * where the browser can); each material keeps every variant it has compiled,
 * so crossing dusk later just switches.
 */
export const ShaderWarmup = ({ children }: { children: ReactNode }) => {
  const nightness = useContext(DaylightContext)
  const { gl: renderer, scene, camera, invalidate, get } = useThree()
  const setFrameloop = useThree((state) => state.setFrameloop)
  const [forced, setForced] = useState<boolean | null>(null)

  // Once, after the office has loaded.
  useEffect(() => {
    const timer = window.setTimeout(() => setForced(!(nightness > LAMPS_ON)), DELAY)

    return () => window.clearTimeout(timer)
    // Only the time of day at load decides which way to warm up.
  }, [])

  // The lamps have flipped (this commit): compile, then put them back.
  useEffect(() => {
    if (forced === null) return

    let isDone = false
    const { frameloop } = get()
    setFrameloop("never")
    renderer
      .compileAsync(scene, camera)
      .catch(() => {}) // A failed warm-up just means compiling later, as before.
      .finally(() => {
        if (isDone) return

        isDone = true
        setFrameloop(frameloop)
        setForced(null)
        // The lamps flip back: their shadows must be drawn afresh.
        markShadowsDirty(renderer, invalidate)
      })

    return () => {
      // Left mid-way (unmounted): don't leave rendering paused.
      if (!isDone) setFrameloop(frameloop)

      isDone = true
    }
  }, [forced, renderer, scene, camera, get, setFrameloop, invalidate])

  return <WarmupContext.Provider value={forced}>{children}</WarmupContext.Provider>
}
