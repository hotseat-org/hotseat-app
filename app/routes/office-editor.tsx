import { lazy, Suspense } from "react"
import { ClientOnly } from "remix-utils/client-only"
import type { MetaFunction } from "react-router"
import { EditorBoundary } from "~/components/OfficeEditor/EditorBoundary"

// three / R3F are browser-only — keep them out of the server bundle.
const OfficeEditor = lazy(() => import("~/components/OfficeEditor/OfficeEditor.client"))

export const meta: MetaFunction = () => [{ title: "Office Editor · Hotseat" }]

const Fallback = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#dfe4ec] dark:bg-[#20242e]">
    <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
      <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <p className="text-sm">Loading the studio…</p>
    </div>
  </div>
)

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
