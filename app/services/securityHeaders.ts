/**
 * Headers every response carries (the hosted Worker and the Node server alike;
 * Cloudflare's static files get them from public/_headers): not framed by other
 * sites, no type sniffing, a lean referrer, no camera/microphone/location, and
 * a window of its own. Keep public/_headers alike.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
}

/**
 * Over HTTPS: stay on HTTPS (half a year). Not for subdomains: the host may be
 * shared (the hosted service lives on vidlak.net).
 */
const STRICT_TRANSPORT_SECURITY = "max-age=15552000"

/** Whether the person reached us over HTTPS (directly, or through a proxy that says so). */
export const isHttpsRequest = (request: Request) =>
  new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"

/** The response, with the security headers it doesn't set itself. */
export const withSecurityHeaders = (response: Response, isHttps: boolean) => {
  const secured = new Response(response.body, response)
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    if (!secured.headers.has(name)) secured.headers.set(name, value)
  if (isHttps) secured.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY)

  return secured
}
