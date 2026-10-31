import { lazy, Suspense } from "react"
import { ClientOnly } from "remix-utils/client-only"
import type { MetaFunction } from "react-router"
import { EditorBoundary } from "~/editor"
import { metaTranslator } from "~/i18n/translate"
import { useI18n } from "~/i18n/I18nProvider"

// three / R3F are browser-only — keep them out of the server bundle.
const loadOfficeEditor = () => import("~/office/OfficeEditor.client")
// In the browser, the editor (the biggest download) starts loading with this
// page's own code — not after hydration, when <ClientOnly> first renders it.
if (typeof window !== "undefined") void loadOfficeEditor()
const OfficeEditor = lazy(loadOfficeEditor)

export const meta: MetaFunction = ({ matches }) => [
  { title: `${metaTranslator(matches).t("Office Editor")} · Hotseat` },
]

const Fallback = () => {
  const { t } = useI18n()
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#dfe4ec] dark:bg-[#20242e]">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="text-sm">{t("Loading the studio…")}</p>
      </div>
    </div>
  )
}

export default function OfficeEditorRoute() {
  return (
    <div className="h-screen w-screen">
      <ClientOnly fallback={<Fallback />}>
        {() => (
          <EditorBoundary>
            <Suspense fallback={<Fallback />}>
              <OfficeEditor />
            </Suspense>
          </EditorBoundary>
        )}
      </ClientOnly>
    </div>
  )
}
