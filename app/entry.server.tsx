import type { EntryContext } from "react-router"
import { ServerRouter } from "react-router"
import { isbot } from "isbot"
import { renderToReadableStream } from "react-dom/server"

export const streamTimeout = 5_000

// Workers have web streams, not Node's `renderToPipeableStream` (the default entry)
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  let statusCode = responseStatusCode
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), streamTimeout + 1_000)

  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: abortController.signal,
      onError(error: unknown) {
        statusCode = 500
        console.error(error)
      },
    }
  )
  body.allReady.finally(() => clearTimeout(timeoutId))

  // Bots and SPA mode get the fully rendered document, not a stream
  if (isbot(request.headers.get("user-agent") ?? "") || routerContext.isSpaMode) {
    await body.allReady
  }

  responseHeaders.set("Content-Type", "text/html")
  return new Response(body, { headers: responseHeaders, status: statusCode })
}
