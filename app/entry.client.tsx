import { startTransition, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { HydratedRouter } from "react-router/dom"
import { loadMessages } from "~/i18n/translate"

/**
 * React Router's own client entry, waiting for one thing first: a page in
 * Czech needs its messages before hydrating, to read the same as the
 * server's HTML. English needs none, so English readers never download them.
 */
const hydrate = async () => {
  if (document.documentElement.lang === "cs") await loadMessages("cs")

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    )
  })
}

void hydrate()
