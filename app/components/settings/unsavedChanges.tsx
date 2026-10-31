import { createContext, useContext, useEffect, type RefObject } from "react"

/** A settings panel's form with edits not yet saved, and how to throw them away. */
export interface UnsavedChanges {
  isDirty: boolean
  discard: () => void
}

/** Where the open panel's unsaved changes are kept for the settings shell to ask about. */
const UnsavedChangesContext = createContext<RefObject<UnsavedChanges | null> | null>(null)

export const UnsavedChangesProvider = UnsavedChangesContext.Provider

/**
 * A panel's form tells the settings shell about its unsaved changes (see
 * SaveBar), so leaving — closing, going back, another section — asks first.
 */
export const useReportUnsavedChanges = (changes: UnsavedChanges) => {
  const current = useContext(UnsavedChangesContext)
  useEffect(() => {
    if (!current) return

    current.current = changes

    return () => {
      if (current.current === changes) current.current = null
    }
  })
}
