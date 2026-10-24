import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { EditorStoreContextProvider, type EditorStore } from "../store"
import { PeopleContext, type People } from "../people"
import { Scene } from "./Scene"
import { FpsMeter } from "./FpsMeter"
import type { FitInsets } from "./CameraFit"
import { I18nBridge, useI18n } from "~/i18n/I18nProvider"

interface Props {
  store: EditorStore
  people: People
  readOnly: boolean
  dark: boolean
  /** Screen space the floating panels cover (px): Fit frames the office beside them. */
  fitInsets?: FitInsets
  /** Perf HUD on: render continuously so the FPS reading is comparable. */
  showStats: boolean
  onStats: (fps: number, ms: number) => void
}

/**
 * The 3D office. Its own module so OfficeEditor can load it lazily: three.js,
 * R3F and every model stay out of the bundle until the 3D view is shown — the
 * simple (top-down SVG) view never downloads them.
 */
const SceneCanvas = ({ store, people, readOnly, dark, fitInsets, showStats, onStats }: Props) => {
  const i18n = useI18n()
  return (
    <Canvas
      shadows
      // Capped at 1.5× — on retina, 2× is ~1.8× the pixels (and post-fx cost)
      // for a barely visible sharpness gain on this soft, rounded style.
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      frameloop={showStats ? "always" : "demand"}
      onPointerMissed={() => store.getState().closeSeatCard()}
    >
      <Suspense fallback={null}>
        {/* Bridge the store into the R3F tree — context doesn't cross the Canvas. */}
        <EditorStoreContextProvider value={store}>
          <PeopleContext.Provider value={people}>
            <I18nBridge value={i18n}>
              <Scene readOnly={readOnly} dark={dark} fitInsets={fitInsets} />
            </I18nBridge>
          </PeopleContext.Provider>
        </EditorStoreContextProvider>
        {showStats && <FpsMeter onSample={onStats} />}
      </Suspense>
    </Canvas>
  )
}

export default SceneCanvas
