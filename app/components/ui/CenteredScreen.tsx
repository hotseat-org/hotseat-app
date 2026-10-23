import type { ReactNode } from "react"
import { ContourBackdrop } from "./ContourBackdrop"

/** Full-height, centered screen on the app background, over its contour terrain. */
export const CenteredScreen = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-6 text-foreground">
    <ContourBackdrop />
    {children}
  </div>
)
