import clsx from "clsx"

interface Props {
  isVisible: boolean
  /** What's happening (kept while the overlay fades out). */
  label: string | null
  /** Opening the office: cover the empty canvas, not just dim the scene. */
  isFirstLoad: boolean
}

/**
 * Shown while the 3D scene is busy: first building the office, then switching
 * to and from editing — moments the page can freeze for a second or two. Its
 * ring and glow animate only transforms and opacity, which browsers run off
 * the main thread, so they keep moving through the freeze instead of stalling
 * with it. While it's up, the scene can't be touched.
 */
export const SceneLoading = ({ isVisible, label, isFirstLoad }: Props) => (
  <div
    aria-hidden={!isVisible}
    className={clsx(
      "absolute inset-0 grid place-items-center transition-opacity duration-300",
      // While up, it takes the pointer: a zoom made while the scene is busy
      // would otherwise wait and happen once it's free.
      isVisible ? "opacity-100" : "pointer-events-none opacity-0",
      isFirstLoad ? "bg-background" : "bg-background/25"
    )}
  >
    <div
      role="status"
      className={clsx(
        "flex items-center gap-3 rounded-full border border-border bg-overlay py-2.5 pl-3 pr-5 shadow-overlay transition-transform duration-300",
        isVisible ? "scale-100" : "scale-95"
      )}
    >
      <span className="relative grid size-7 place-items-center">
        {/* A soft glow breathing behind a turning arc. */}
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/25 will-change-transform [animation-duration:1.6s]" />
        <svg
          viewBox="0 0 28 28"
          className="size-7 animate-spin text-accent will-change-transform [animation-duration:0.9s]"
        >
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="3"
          />
          <path
            d="M14 3a11 11 0 0 1 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  </div>
)
