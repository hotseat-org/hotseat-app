import type { Object3D } from "three"

/**
 * Pieces' outlines (see PieceOutline) are on a layer of their own. Editing,
 * the camera draws them with the scene. Viewing, post-processing (PostFx)
 * draws the scene without them — its ambient occlusion reads the scene's
 * depth, which in WebGPU can't also hold the stencil the outlines need — and
 * the outlines in a small pass of their own, laid over it where nothing in
 * the scene stands in front of them.
 */
export const OUTLINE_LAYER = 1

/**
 * The outlines showing now (pointed at, selected or easing out). With none,
 * PostFx doesn't draw the outlines' pass: empty, it still cost a few ms a frame.
 */
export const shownOutlines = new Set<Object3D>()
