/**
 * Building blocks for a module's own pieces: 3D models (three.js and React
 * Three Fiber), plan symbols and drawings, and the scene's light and motion
 * they react to. Client only — never import this where the server runs.
 * See core.ts for the other entry points.
 */

// 3D models: shaded surfaces, rounded boxes, glass, GLB models.
export { Surface } from "./objects/Surface"
export { RoundedBox } from "./objects/RoundedBox"
export { Glass } from "./objects/GlassWall"
export { Model } from "./objects/Model"
export { WiggleModel } from "./objects/WiggleModel"
export { NO_BAKE } from "./objects/Baked"
// What a model is drawn for: its piece (null in a thumbnail), and whether as a ghost (placing it).
export { usePiece } from "./objects/pieceContext"
export { GhostContext } from "./objects/Surface"

// The scene they stand in: time of day, lamps, shadows, motion, theme.
export { DaylightContext } from "./lighting/daylight"
export { useLampsOn } from "./scene/ShaderWarmup"
export { cacheShadow, markShadowsDirty } from "./lighting/shadows"
export { prefersReducedMotion, subscribeAmbient } from "./scene/ambient"
export { useSurfaces } from "./scene/sceneTheme"

// The 2D plan: symbols, colours, the view and gliding it.
export { Sketch, WINDOW_GLASS, type DrawSymbol } from "./plan/sketch"
export { shade } from "./plan/shapes"
export { MAX_ZOOM, fitView, turnObject, turnPoint, type View } from "./plan/planView"
export { GLIDE_MS, type Frame } from "./plan/useFraming"
