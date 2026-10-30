import { Button } from "@heroui/react"
import clsx from "clsx"
import { ArrowRight, Check } from "lucide-react"
import { useEffect, useLayoutEffect, useState, useMemo } from "react"
import { useEditorStore, useEditorStoreApi, type EditorState } from "../store"
import { isWall } from "../types"
import { useModules } from "../modules"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

const STORAGE_KEY = "office-editor:tour-done"
/** Room round a highlighted control (px). */
const RING_GAP = 6

export interface TourStep {
  /** Others are placed after it by this (see EditorModule.tourSteps). */
  id: string
  title: string
  body: string
  /** The control it's about (`data-tour` value), ringed while it shows. */
  target?: string
  /** Done by doing it: moves on by itself once this holds (vs. the state it started in). */
  isDone?: (now: EditorState, start: EditorState) => boolean
}

const wallCount = (state: EditorState) =>
  state.objects.filter((object) => isWall(object.type)).length
/** What's selected, and where it stands. */
const selectionKey = (state: EditorState) =>
  state.objects
    .filter((object) => state.selection.includes(object.id))
    .map((object) => `${object.id}@${object.x},${object.z},${object.rotation}`)
    .join("|")

const CORE_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: msg("Welcome to the editor"),
    body: msg("Six quick steps. Try each one as you go — the tour moves on by itself."),
  },
  {
    id: "drawRoom",
    title: msg("Draw a room"),
    body: msg(
      "Open Structure, pick Room and drag across the floor. Later, drag a wall by its foot to resize the room."
    ),
    target: "catalog",
    isDone: (now, start) => wallCount(now) >= wallCount(start) + 4,
  },
  {
    id: "select",
    title: msg("Select, move, turn"),
    body: msg(
      "Click a piece to select it, drag to move it, press R to turn it. Right-click for more — like saving a room to use again."
    ),
    // Something else selected, or the selection moved or turned.
    isDone: (now, start) => now.selection.length > 0 && selectionKey(now) !== selectionKey(start),
  },
  {
    id: "find",
    title: msg("Find anything"),
    body: msg("Press ⌘K (Ctrl+K) to search every command and every piece by name."),
    target: "search",
    isDone: (now) => now.isCommandSearchOpen,
  },
]

/** Whether this browser has finished (or skipped) the tour. */
export const isTourDone = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return true // no storage: don't show it on every visit
  }
}

/**
 * The first time someone edits a layout: a short tour in a card above the
 * bottom bar, ringing the control each step is about. Steps move on when
 * they're done for real (a room drawn, a desk placed…); Next and Skip are
 * always there. Seen once per browser; ⌘K → "Show the tour" brings it back.
 */
/** The core's steps with each module's placed after the step it follows. */
const useTourSteps = () => {
  const modules = useModules()
  return useMemo(() => {
    const steps = [...CORE_STEPS]
    for (const { after, step } of modules.flatMap((module) => module.tourSteps ?? [])) {
      const index = steps.findIndex((candidate) => candidate.id === after)
      steps.splice(index < 0 ? steps.length : index + 1, 0, step)
    }
    return steps
  }, [modules])
}

export const GuidedTour = () => {
  const isOpen = useEditorStore((state) => state.isTourOpen)
  if (!isOpen) return null
  return <TourCard />
}

const TourCard = () => {
  const steps = useTourSteps()
  const { t } = useI18n()
  const store = useEditorStoreApi()
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const isLast = index === steps.length - 1

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // Storage blocked: it just shows again next time.
    }
    store.getState().setTourOpen(false)
  }

  // Done by doing: watch the editor from the moment the step shows.
  useEffect(() => {
    const isDone = step.isDone
    if (!isDone) return
    const start = store.getState()
    return store.subscribe((now) => {
      // From this step only: several updates in a row mustn't skip the next.
      if (isDone(now, start)) setIndex((i) => (i === index ? Math.min(i + 1, steps.length - 1) : i))
    })
  }, [index, step, store])

  // The ring round the step's control, kept on it as the window changes.
  const [ring, setRing] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    if (!step.target) return setRing(null)
    const update = () =>
      setRing(
        document.querySelector(`[data-tour="${step.target}"]`)?.getBoundingClientRect() ?? null
      )
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [step])

  return (
    <>
      {ring && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-30 animate-pulse rounded-2xl ring-[3px] ring-accent"
          style={{
            left: ring.left - RING_GAP,
            top: ring.top - RING_GAP,
            width: ring.width + RING_GAP * 2,
            height: ring.height + RING_GAP * 2,
          }}
        />
      )}
      <div className="absolute inset-x-0 bottom-24 z-30 flex justify-center px-4">
        <section
          aria-live="polite"
          aria-labelledby="tour-title"
          className="pointer-events-auto w-[min(26rem,100%)] rounded-2xl border border-accent/30 bg-overlay/95 p-4 text-foreground shadow-overlay backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="tour-title" className="text-sm font-extrabold">
              {t(step.title)}
            </h2>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
              {t("{n} of {count}", { n: index + 1, count: steps.length })}
            </span>
          </div>
          {/* Fixed height: the card doesn't jump between steps. */}
          <p className="mt-1 min-h-[3.75rem] text-sm leading-snug text-muted">{t(step.body)}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "h-1.5 rounded-full transition-all",
                    i === index
                      ? "w-5 bg-accent"
                      : i < index
                        ? "w-1.5 bg-accent/50"
                        : "w-1.5 bg-foreground/15"
                  )}
                />
              ))}
            </div>
            {!isLast && (
              <Button size="sm" variant="tertiary" onPress={finish}>
                {t("Skip tour")}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" variant="primary" onPress={finish}>
                <Check className="size-4" strokeWidth={2.5} />
                {t("Finish")}
              </Button>
            ) : (
              <Button size="sm" variant="primary" onPress={() => setIndex(index + 1)}>
                {t("Next")}
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
