import { createContext, useContext, useMemo, useRef } from "react"
import type { SceneObject } from "./types"
import type {
  EditorModule,
  PieceState,
  PlanDrawingContext,
  PlanDrawings,
  PlanPieceStyle,
  ViewClicks,
} from "./module"
import type { Translator } from "~/i18n/translate"

/**
 * The modules an editor runs with, for its components (and, bridged, the 3D
 * scene's). Fixed for an editor's life — so a module's hooks are called in
 * the same order on every render, and calling them in a loop is safe.
 */
export const ModulesContext = createContext<EditorModule[]>([])

export const useModules = () => useContext(ModulesContext)

/** Every module's piece states, merged (null: no module has any). */
export const usePieceStates = (isViewing: boolean): ReadonlyMap<string, PieceState> | null => {
  const modules = useModules()
  // Each module's hook, in a loop: safe, the list is fixed (see ModulesContext).
  const states = modules.map((module) => module.usePieceStates?.(isViewing) ?? null)
  return useMemo(
    () => {
      const present = states.filter((state) => state !== null)
      return present.length > 1
        ? new Map(present.flatMap((state) => [...state]))
        : (present[0] ?? null)
    },
    // One map (or null) per module — the list keeps its length; their own
    // memos keep them stable.
    states
  )
}

/** What clicks do while viewing, from every module (each one's handler runs). */
export const useViewClicks = (): Required<ViewClicks> => {
  const modules = useModules()
  // Each module's hook, in a loop: safe, the list is fixed (see ModulesContext).
  const clicks = modules.map((module) => module.useViewClicks?.() ?? {})
  // Stable handlers (pieces are memoized), always calling the latest ones.
  const latest = useRef(clicks)
  latest.current = clicks
  return useMemo(
    () => ({
      isClickable: (object: SceneObject) =>
        latest.current.some((click) => click.isClickable?.(object)),
      onPiece: (id: string) => latest.current.forEach((click) => click.onPiece?.(id)),
      onFloor: () => latest.current.forEach((click) => click.onFloor?.()),
    }),
    []
  )
}

/** How each piece is drawn on the plan: the first module with a style for it. */
export const usePlanPieceStyles = (objects: SceneObject[]) => {
  const modules = useModules()
  // Each module's hook, in a loop: safe, the list is fixed (see ModulesContext).
  const styles = modules.flatMap((module) =>
    module.plan?.usePieceStyles ? [module.plan.usePieceStyles(objects)] : []
  )
  return useMemo(
    () =>
      (object: SceneObject): PlanPieceStyle | undefined => {
        for (const style of styles) {
          const found = style(object)
          if (found) return found
        }
        return undefined
      },
    // One function per module (the list keeps its length).
    styles
  )
}

/** Every module's plan drawings, in module order. */
export const usePlanDrawings = (context: PlanDrawingContext): PlanDrawings[] => {
  const modules = useModules()
  // Each module's hook, in a loop: safe, the list is fixed (see ModulesContext).
  const drawings = modules.flatMap((module) =>
    module.plan?.useDrawings ? [module.plan.useDrawings(context)] : []
  )
  return useMemo(() => drawings, drawings)
}

/** What the modules say about some pieces ("8 desks"), joined; null when none says anything. */
export const describePieces = (
  modules: EditorModule[],
  objects: SceneObject[],
  translator: Translator
) =>
  modules.flatMap((module) => module.describePieces?.(objects, translator) ?? []).join(" · ") ||
  null
