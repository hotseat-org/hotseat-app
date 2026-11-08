import { Canvas, events, useFrame, useThree } from "@react-three/fiber"
import type { Intersection } from "three"
import { Suspense, useEffect, useRef } from "react"
import { EditorStoreContextProvider, type EditorStore } from "../store"
import { ModulesContext, useModules, useViewClicks } from "../modules"
import type { FitInsets } from "../camera/CameraFit"
import { Scene } from "./Scene"
import { isOnHiddenFloor } from "./keptFloors"
import { createRenderer } from "./createRenderer"
import { FpsMeter, type FrameStats } from "./FpsMeter"
import { I18nBridge, useI18n } from "~/i18n/I18nProvider"

interface Props {
  store: EditorStore
  readOnly: boolean
  dark: boolean
  /** Screen space the floating panels cover (px): Fit frames the office beside them. */
  fitInsets?: FitInsets
  /** Move the picture's centre right (px), for a column of text on the left. */
  sceneShift?: number
  /** Perf HUD on: render continuously so the FPS reading is comparable. */
  showStats: boolean
  onStats: (stats: FrameStats) => void
  /** Called once the scene has drawn for real: after loading, and after each switch of mode. */
  onReady?: (readOnly: boolean) => void
}

const createSceneRenderer = createRenderer({ stencil: true })

/**
 * The 3D office. Its own module so the Editor can load it lazily: three.js,
 * R3F and every model stay out of the bundle until the 3D view is shown — the
 * simple (top-down SVG) view never downloads them.
 */
const SceneCanvas = ({
  store,
  readOnly,
  dark,
  fitInsets,
  sceneShift,
  showStats,
  onStats,
  onReady,
}: Props) => {
  const i18n = useI18n()
  const modules = useModules()
  const viewClicks = useViewClicks()

  return (
    <Canvas
      // Soft (PCFSoft): smooth. WebGPU's plain PCF spreads its samples with
      // per-pixel noise — speckled edges. The sun filters wider still (see
      // shadows.ts).
      shadows="soft"
      // Capped at 1.5× — on retina, 2× is ~1.8× the pixels (and post-fx cost)
      // for a barely visible sharpness gain on this soft, rounded style.
      dpr={[1, 1.5]}
      // WebGPU (WebGL 2 where there's none). A stencil: a piece's outline goes
      // round it, not over it (PieceOutline).
      gl={createSceneRenderer}
      frameloop={showStats ? "always" : "demand"}
      events={createPointerEvents}
      onPointerMissed={() => viewClicks.onFloor()}
    >
      <Suspense fallback={null}>
        {/* Bridge the store into the R3F tree — context doesn't cross the Canvas. */}
        <EditorStoreContextProvider value={store}>
          <ModulesContext.Provider value={modules}>
            <I18nBridge value={i18n}>
              <Scene
                readOnly={readOnly}
                dark={dark}
                fitInsets={fitInsets}
                sceneShift={sceneShift}
              />
            </I18nBridge>
          </ModulesContext.Provider>
        </EditorStoreContextProvider>
        {showStats && <FpsMeter onSample={onStats} />}
        {onReady && <ReadySignal readOnly={readOnly} onReady={onReady} />}
      </Suspense>
    </Canvas>
  )
}

/** R3F's pointer events, past the pieces of floors kept hidden (see useKeptFloors). */
const createPointerEvents = (store: Parameters<typeof events>[0]) => ({
  ...events(store),
  filter: (hits: Intersection[]) => hits.filter((hit) => !isOnHiddenFloor(hit.object)),
})

/**
 * When the scene counts as ready: once this many frames in a row came quickly
 * (each within SETTLED_FRAME_MS of the last) — the first ones build materials
 * and shaders and can block the page for a while; ready means it answers at
 * once. At the latest after READY_CAP_MS, whatever happens.
 */
const SETTLED_FRAMES = 3
const SETTLED_FRAME_MS = 100
const READY_CAP_MS = 15_000

/**
 * Tells the page when the scene is really there: drawn, and drawing smoothly,
 * after it loaded or after a mode switch (whose first frames are the slow
 * ones). Inside the Suspense boundary, so loading models count too.
 */
const ReadySignal = ({
  readOnly,
  onReady,
}: {
  readOnly: boolean
  onReady: (readOnly: boolean) => void
}) => {
  const progress = useRef({ isReady: false, settled: 0, startedAt: 0, lastFrameAt: 0 })
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    progress.current = { isReady: false, settled: 0, startedAt: performance.now(), lastFrameAt: 0 }
    invalidate() // under frameloop="demand", make sure the frames come
  }, [readOnly, invalidate])

  useFrame(() => {
    const state = progress.current
    if (state.isReady) return

    const now = performance.now()
    const isQuick = state.lastFrameAt > 0 && now - state.lastFrameAt <= SETTLED_FRAME_MS
    state.settled = isQuick ? state.settled + 1 : 0
    state.lastFrameAt = now

    if (state.settled >= SETTLED_FRAMES || now - state.startedAt > READY_CAP_MS) {
      state.isReady = true
      onReady(readOnly)

      return
    }

    invalidate()
  })

  return null
}

export default SceneCanvas
