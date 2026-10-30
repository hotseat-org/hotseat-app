import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useRef } from "react"
import { EditorStoreContextProvider, type EditorStore } from "../store"
import { ModulesContext, useModules, useViewClicks } from "../modules"
import { Scene } from "./Scene"
import { FpsMeter, type FrameStats } from "./FpsMeter"
import type { FitInsets } from "./CameraFit"
import { I18nBridge, useI18n } from "~/i18n/I18nProvider"

interface Props {
  store: EditorStore
  readOnly: boolean
  dark: boolean
  /** Screen space the floating panels cover (px): Fit frames the office beside them. */
  fitInsets?: FitInsets
  /** Perf HUD on: render continuously so the FPS reading is comparable. */
  showStats: boolean
  onStats: (stats: FrameStats) => void
  /** Called once the scene has drawn for real: after loading, and after each switch of mode. */
  onReady?: (readOnly: boolean) => void
}

/**
 * The 3D office. Its own module so the Editor can load it lazily: three.js,
 * R3F and every model stay out of the bundle until the 3D view is shown — the
 * simple (top-down SVG) view never downloads them.
 */
const SceneCanvas = ({ store, readOnly, dark, fitInsets, showStats, onStats, onReady }: Props) => {
  const i18n = useI18n()
  const modules = useModules()
  const viewClicks = useViewClicks()

  return (
    <Canvas
      // PCF, which three.js uses anyway: asking for PCFSoft (`shadows`), it
      // falls back to PCF — and R3F, seeing the type "change" back on every
      // re-render, redrew the (cached) shadow maps each time.
      shadows="percentage"
      // Capped at 1.5× — on retina, 2× is ~1.8× the pixels (and post-fx cost)
      // for a barely visible sharpness gain on this soft, rounded style.
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      frameloop={showStats ? "always" : "demand"}
      onPointerMissed={() => viewClicks.onFloor()}
      // Checking each new shader for errors makes the browser finish compiling
      // it on the spot (a long stall when a big office first renders, or on
      // switching to editing). Development keeps the checks and their messages.
      onCreated={({ gl: renderer }) => {
        renderer.debug.checkShaderErrors = import.meta.env.DEV
      }}
    >
      <Suspense fallback={null}>
        {/* Bridge the store into the R3F tree — context doesn't cross the Canvas. */}
        <EditorStoreContextProvider value={store}>
          <ModulesContext.Provider value={modules}>
            <I18nBridge value={i18n}>
              <Scene readOnly={readOnly} dark={dark} fitInsets={fitInsets} />
            </I18nBridge>
          </ModulesContext.Provider>
        </EditorStoreContextProvider>
        {showStats && <FpsMeter onSample={onStats} />}
        {onReady && <ReadySignal readOnly={readOnly} onReady={onReady} />}
      </Suspense>
    </Canvas>
  )
}

/** Frames to draw before the scene counts as ready (the first compiles shaders). */
const FRAMES_TO_READY = 2

/**
 * Tells the page when the scene is really there: a couple of frames drawn
 * after it loaded, or after a mode switch (whose first frames are the slow
 * ones). Inside the Suspense boundary, so loading models count too.
 */
const ReadySignal = ({
  readOnly,
  onReady,
}: {
  readOnly: boolean
  onReady: (readOnly: boolean) => void
}) => {
  const frames = useRef(0)
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    frames.current = 0
    invalidate() // under frameloop="demand", make sure those frames come
  }, [readOnly, invalidate])
  useFrame(() => {
    if (frames.current > FRAMES_TO_READY) return

    frames.current++
    if (frames.current === FRAMES_TO_READY) onReady(readOnly)
    else invalidate()
  })

  return null
}

export default SceneCanvas
