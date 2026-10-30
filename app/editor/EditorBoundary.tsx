import { Component, type ReactNode } from "react"
import { useI18n } from "~/i18n/I18nProvider"

/** What shows instead of the editor (a function component: it needs the language). */
const LoadFailed = () => {
  const { t } = useI18n()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#dfe4ec] text-slate-600 dark:bg-[#20242e] dark:text-slate-300">
      <p className="text-sm">{t("The 3D editor failed to load.")}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        {t("Reload")}
      </button>
    </div>
  )
}

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

const RELOAD_TS = "office-editor-reload-ts"
// Only auto-reload if we haven't already tried within this window. A transient
// chunk-abort recovers on the reload; a persistent failure that throws again
// immediately falls through to the error UI instead of reloading forever.
const RELOAD_WINDOW_MS = 8000

/**
 * Guards the lazily-loaded 3D editor. In dev, Vite can abort an in-flight chunk
 * import after a dependency re-optimize; rather than leaving a blank canvas we
 * reload once to recover, and otherwise show a Reload button.
 */
export class EditorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    const message = String(error?.message ?? "")
    const isChunkAbort =
      /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message)
    if (!isChunkAbort || typeof sessionStorage === "undefined") return

    // Reload at most once per window. Crucially we do NOT clear this on mount —
    // the reloaded page mounts fresh, so clearing it there would let an error
    // that reproduces immediately reload again and again (a crash loop).
    const last = Number(sessionStorage.getItem(RELOAD_TS) || 0)
    const now = Date.now()
    if (now - last > RELOAD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_TS, String(now))
      window.location.reload()
    }
  }

  render() {
    if (this.state.error) {
      return <LoadFailed />
    }

    return this.props.children
  }
}
