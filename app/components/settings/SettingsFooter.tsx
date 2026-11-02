import { createContext, useContext, type ReactNode } from "react"
import { createPortal } from "react-dom"

/** Where the open panel's actions go: under its scrolling content (see SettingsShell). */
const SettingsFooterContext = createContext<HTMLElement | null>(null)

export const SettingsFooterProvider = SettingsFooterContext.Provider

/**
 * A panel's actions (Save, Cancel…), pinned under its content: always in
 * view, however long the form. Outside the settings shell, where it is.
 */
export const SettingsFooter = ({ children }: { children: ReactNode }) => {
  const slot = useContext(SettingsFooterContext)

  return slot ? createPortal(children, slot) : <>{children}</>
}
