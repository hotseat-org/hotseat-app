import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { PANEL, PANEL_HOVER, type ShellMember } from "./shell-ui"
import { useEditorStore } from "~/editor"
import { useHeadline } from "~/office/headline/useHeadline"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * How far the 3D picture's centre moves right (px) for the column: the office
 * sits in the space beside it (see ViewShift).
 */
export const HEADLINE_SCENE_SHIFT = 300

/** Folding and unfolding: opacity and transform only, off with reduced motion. */
const MOTION = "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none"

/**
 * The office's left column: the shown day as a headline ("Monday.") and a few
 * sentences — where you sit, what's free, who's in — with what to do about
 * your day. The day itself changes in the dock (one place for it). Zooming
 * into the office shrinks it into one line under the switcher, so it never
 * covers what you look at closely; zooming back out (or tapping the line,
 * which frames the office) brings it back.
 */
export const HeadlineColumn = ({
  me,
  members,
  actions,
}: {
  me: ShellMember
  members: ShellMember[]
  /** What to do about your day (the way to your desk, finding one, the waitlist). */
  actions?: ReactNode
}) => {
  const { t } = useI18n()
  const headline = useHeadline(me, members)
  const isFolded = useEditorStore((state) => state.isZoomedIn)
  const requestFit = useEditorStore((state) => state.requestFit)
  if (!headline) return null

  const [yours, ...office] = headline.sentences

  return (
    <>
      <section
        aria-label={t("Your day")}
        inert={isFolded}
        // The same names as a page's: opening one grows the column into it.
        style={{ viewTransitionName: "column" }}
        className={`${MOTION} pointer-events-none absolute left-6 top-24 w-[min(560px,40vw)] max-[1279px]:top-[148px] origin-top-left text-foreground ${
          isFolded ? "opacity-0 [transform:translateY(-12px)_scale(0.45)]" : "[transform:none]"
        }`}
      >
        {/* A new day's title and sentence rise into place (keyed by their text). */}
        <h1
          key={headline.title}
          style={{ viewTransitionName: "column-title" }}
          className="motion-rise text-[clamp(56px,6.4vw,92px)] leading-[0.95] font-black tracking-[-0.03em]"
        >
          {headline.title}
        </h1>

        {/* The live region stays (so the new day is read out); its words are new. */}
        <p
          aria-live="polite"
          className="mt-5 text-[clamp(22px,2.3vw,34px)] leading-tight font-extrabold tracking-[-0.01em]"
        >
          <span key={headline.sentences.join(" ")} className="motion-rise block">
            {yours} <span className="text-muted">{office.join(" ")}</span>
          </span>
        </p>
        {actions && (
          <p className="pointer-events-auto mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xl">
            {actions}
          </p>
        )}
      </section>

      <button
        type="button"
        inert={!isFolded}
        aria-label={t("Show your day")}
        onClick={requestFit}
        className={`${PANEL} ${PANEL_HOVER} ${MOTION} absolute left-5 top-[84px] flex max-w-[min(620px,50vw)] max-[1279px]:top-[144px] items-center gap-2.5 py-2 pr-2 pl-3.5 text-left text-[15px] leading-snug font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          isFolded
            ? "pointer-events-auto [transform:none]"
            : "pointer-events-none opacity-0 [transform:translateY(-8px)]"
        }`}
      >
        <span>
          <b className="font-black">{headline.title}</b> {yours}{" "}
          <span className="text-muted">{office.join(" ")}</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-secondary">
          <ChevronDown className="size-4" />
        </span>
      </button>
    </>
  )
}
