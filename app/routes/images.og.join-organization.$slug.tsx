import { createHash } from "crypto"
import { LoaderFunctionArgs, redirect } from "react-router"
import { ImageResponse } from "workers-og"
import { GifReader } from "omggif"
import { PNG } from "pngjs"
import { getCore } from "~/core/get-core"

const md5 = (value: string) => createHash("md5").update(value).digest("hex")

export const loader = async ({ request, params: { slug } }: LoaderFunctionArgs) => {
  if (!slug) return redirect("/")

  const core = getCore()
  const organization = await core.organization.getForPublic({ slug })

  if (!organization) return redirect("/")

  const requestEtag = request.headers.get("if-none-match")
  const dataHash = md5(
    `${organization.name}.${organization.thumbnailUrl}.${organization.description}`
  )

  if (requestEtag === dataHash) {
    return new Response(undefined, {
      status: 304,
    })
  }

  // Fetch the logo and convert to a data URL so Satori can render it.
  // GIFs are not supported by Satori — extract the first frame and re-encode as PNG.
  let logoDataUrl: string | null = null
  if (organization.thumbnailUrl) {
    try {
      const imgRes = await fetch(organization.thumbnailUrl)
      const contentType = imgRes.headers.get("content-type") ?? ""
      const buffer = Buffer.from(await imgRes.arrayBuffer())

      if (contentType.includes("gif")) {
        const reader = new GifReader(buffer)
        const { width, height } = reader
        const pixels = new Uint8ClampedArray(width * height * 4)
        reader.decodeAndBlitFrameRGBA(0, pixels)
        const png = new PNG({ width, height })
        png.data = Buffer.from(pixels)
        const pngBuffer = PNG.sync.write(png)
        logoDataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`
      } else if (contentType.startsWith("image/")) {
        logoDataUrl = `data:${contentType};base64,${buffer.toString("base64")}`
      }
    } catch {
      // silently fall back to initial letter
    }
  }

  const response = new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0c0c1d 0%, #141428 60%, #0c0c1d 100%)",
        padding: "64px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {/* Glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-80px",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-100px",
          left: "-80px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: "28px",
        }}
      >
        {/* Badge */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.45)",
              borderRadius: "100px",
              padding: "10px 22px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#818cf8",
                display: "flex",
              }}
            />
            <span
              style={{
                color: "#a5b4fc",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              YOU'VE BEEN INVITED
            </span>
          </div>
        </div>

        {/* Org row */}
        <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
          {logoDataUrl ? (
            <img
              alt={organization.name}
              src={logoDataUrl}
              width={108}
              height={108}
              style={{
                borderRadius: "20px",
                objectFit: "cover",
                border: "1.5px solid rgba(255,255,255,0.12)",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "108px",
                height: "108px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                fontSize: "48px",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
              }}
            >
              {organization.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "26px", fontWeight: 400 }}>
              Join the workspace
            </div>
            <div
              style={{
                color: "white",
                fontSize: organization.name.length > 20 ? "56px" : "72px",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {organization.name}
            </div>
            {/* Description */}
            {organization.description && (
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "26px",
                  lineHeight: 1.5,
                  maxWidth: "860px",
                  fontWeight: 400,
                }}
              >
                {organization.description.length > 120
                  ? organization.description.slice(0, 120) + "…"
                  : organization.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "rgba(255,255,255,0.3)",
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
            }}
          />
          hotseat
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "100px",
            padding: "10px 22px",
            color: "rgba(255,255,255,0.5)",
            fontSize: "20px",
          }}
        >
          Accept invitation →
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  )

  response.headers.set("cache-control", "max-age=60")
  response.headers.set("etag", dataHash)

  return response
}
