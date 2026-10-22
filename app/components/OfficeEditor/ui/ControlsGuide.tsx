import { Button, CloseButton } from "@heroui/react"
import { Mouse } from "lucide-react"
import { useState } from "react"

export type GuideView = "edit" | "view" | "plan"

// Mouse first, then trackpad, then keys — see CameraControls / FloorPlan.
const ROWS: Record<GuideView, [string, string[]][]> = {
  edit: [
    ["Orbit", ["Right-drag", "⌥ scroll", "Q E"]],
    ["Move", ["Drag floor", "Space-drag", "W A S D"]],
    ["Zoom", ["Scroll", "Pinch", "+ −"]],
  ],
  view: [
    ["Orbit", ["Right-drag", "⌥ scroll", "Q E"]],
    ["Move", ["Drag", "W A S D"]],
    ["Zoom", ["Scroll", "Pinch", "+ −"]],
  ],
  plan: [
    ["Turn", ["Q E"]],
    ["Move", ["Drag"]],
    ["Zoom", ["Scroll", "Pinch", "+ −"]],
  ],
}

const HIDDEN_KEY = "office-editor:controls-guide-hidden"
const readHidden = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1"
  } catch {
    return false
  }
}

/** Camera controls at a glance (bottom-right); folds into a button, remembered. */
export const ControlsGuide = ({ view }: { view: GuideView }) => {
  const [isHidden, setIsHidden] = useState(readHidden)
  const setHidden = (next: boolean) => {
    setIsHidden(next)
    try {
      localStorage.setItem(HIDDEN_KEY, next ? "1" : "0")
    } catch {
      // Not remembered — fine.
    }
  }

  if (isHidden) {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="pointer-events-auto shadow-overlay backdrop-blur-md"
        onPress={() => setHidden(false)}
      >
        <Mouse className="size-4" /> Controls
      </Button>
    )
  }

  return (
    <div className="pointer-events-auto relative rounded-2xl border border-border bg-overlay/90 py-2.5 pl-3 pr-9 text-xs text-foreground shadow-overlay backdrop-blur-md">
      <CloseButton
        aria-label="Hide controls"
        className="absolute right-1.5 top-1.5"
        onPress={() => setHidden(true)}
      />
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
        {ROWS[view].map(([action, inputs]) => (
          <div key={action} className="contents">
            <dt className="font-semibold text-muted">{action}</dt>
            <dd className="flex flex-wrap gap-1">
              {/* Plain tags, not HeroUI's Kbd: it collapses spaces and swaps
                  "+ −" for an arrow glyph ("Q E" → "QE", "+ −" → "←"). */}
              {inputs.map((input) => (
                <span
                  key={input}
                  className="whitespace-pre rounded-md bg-default px-1.5 py-0.5 text-[11px] font-medium text-foreground/80"
                >
                  {input}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
