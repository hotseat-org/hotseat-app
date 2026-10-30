/**
 * The catalogue's looks with the editor's presets registered: import
 * renderers from here (not from renderers.ts), so the presets are loaded.
 * Apart from the catalogue's index, so the layout logic never loads three.js.
 */
import "./presets/structure.render"
import "./presets/furniture.render"

export * from "./renderers"
