import type { ReactNode } from "react"
import { AmbientGlow } from "./AmbientGlow"

/** Full-height, centered screen on the warm background with an ambient glow. */
export const CenteredScreen = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-6 text-foreground">
    <AmbientGlow />
    {children}
  </div>
)
