import { Tooltip } from "@heroui/react"
import { Focus } from "lucide-react"
import { useEditorStore } from "../store"

/** "Fit to office" — frames the whole layout (also the F key). */
export const FitButton = () => {
  const requestFit = useEditorStore((s) => s.requestFit)
  return (
    <Tooltip delay={350}>
      <button
        type="button"
        aria-label="Fit to office (F)"
        onClick={requestFit}
        className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <Focus className="size-4" />
      </button>
      <Tooltip.Content>Fit to office (F)</Tooltip.Content>
    </Tooltip>
  )
}
