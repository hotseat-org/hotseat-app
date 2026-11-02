import { useContext, useEffect, useMemo, useState } from "react"
import { CanvasTexture, Color, LinearFilter, SRGBColorSpace } from "three"
import { float, texture, uniform } from "three/tsl"
import { MeshBasicNodeMaterial } from "three/webgpu"
import { WALL_FACE } from "../wallItem"
import { DEFAULT_SIGN_TEXT, DEFAULT_NEON_COLOR } from "../../catalog/neonSign"
import scriptLatin from "~/styles/fonts/dancing-script-latin-700.woff2?url"
import scriptLatinExt from "~/styles/fonts/dancing-script-latin-ext-700.woff2?url"
import { DaylightContext, NO_BAKE, usePiece } from "~/editor/kit"

interface Props {
  /** The tubes' colour. */
  color?: string
}

const HANG_HEIGHT = 0.8
/**
 * The most the sign takes on the wall (m), glow included: its footprint's
 * width, and up to the wall's top. A long text gets smaller letters.
 */
const MAX_WIDTH = 2
const MAX_HEIGHT = 0.95
/** The texture's letters (px), and the room round them the glow spreads into. */
const FONT_SIZE = 140
const GLOW = 40
const SCRIPT = "Neon script"
const FONT = `700 ${FONT_SIZE}px "${SCRIPT}", cursive`

/**
 * The handwritten face the tubes are bent to (Dancing Script, Czech
 * letters included). Loaded the first time a sign is drawn — no other page
 * downloads it.
 */
let scriptLoading: Promise<unknown> | null = null
const loadScript = () => {
  scriptLoading ??= Promise.all(
    [
      [scriptLatin, "U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122"],
      [scriptLatinExt, "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF"],
    ].map(async ([url, unicodeRange]) => {
      const face = new FontFace(SCRIPT, `url(${url})`, { weight: "700", unicodeRange })
      document.fonts.add(await face.load())
    })
  ).catch(() => {})

  return scriptLoading
}

/** Once the script has loaded: the tubes are bent again in it. */
const useScriptReady = () => {
  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    let isCurrent = true
    void loadScript().then(() => isCurrent && setIsReady(true))

    return () => {
      isCurrent = false
    }
  }, [])

  return isReady
}

/**
 * The text bent in neon, in handwriting: each stroke a tube with a pale core
 * and a rim in its colour, and a soft glow round it, on clear (the canvas's
 * alpha).
 */
const drawNeon = (text: string, color: string) => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  context.font = FONT
  canvas.width = Math.ceil(context.measureText(text).width + FONT_SIZE * 0.3) + GLOW * 2
  canvas.height = Math.ceil(FONT_SIZE * 1.45) + GLOW * 2

  context.font = FONT
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.lineJoin = "round"
  const centre: [number, number] = [canvas.width / 2, canvas.height / 2]

  // The glow: the strokes drawn blurred, twice for strength.
  context.shadowColor = color
  context.shadowBlur = GLOW * 0.8
  context.fillStyle = color
  context.fillText(text, ...centre)
  context.fillText(text, ...centre)

  // The tube: its rim in the colour, its core the gas's light, almost white.
  context.shadowBlur = 0
  context.strokeStyle = color
  context.lineWidth = FONT_SIZE * 0.035
  context.strokeText(text, ...centre)
  context.fillStyle = `#${new Color(color).lerp(new Color("#fffaf0"), 0.7).getHexString()}`
  context.fillText(text, ...centre)

  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.minFilter = LinearFilter
  map.generateMipmaps = false

  return map
}

/**
 * A neon sign straight on the wall, handwritten, saying what's written on it
 * (the Inspector's Sign) in its colour. It glows a little by day, brightly
 * after dark. Its letters aren't baked into the furniture's batches (their
 * texture is the sign's own): one draw call per sign — and what picks it.
 */
export const NeonSign = ({ color = DEFAULT_NEON_COLOR }: Props) => {
  const piece = usePiece()
  const nightness = useContext(DaylightContext)
  const isScriptReady = useScriptReady()
  const text = piece?.signText ?? DEFAULT_SIGN_TEXT

  const look = useMemo(() => {
    const map = drawNeon(text, color)
    const brightness = uniform(1)
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    material.colorNode = texture(map).rgb.mul(brightness)
    material.opacityNode = texture(map).a
    material.maskNode = texture(map).a.greaterThan(float(0.01))
    const { width, height } = map.image as HTMLCanvasElement

    return { map, material, brightness, aspect: width / height }
    // Drawn again once the page's own font is in.
  }, [text, color, isScriptReady])
  useEffect(
    () => () => {
      look.map.dispose()
      look.material.dispose()
    },
    [look]
  )
  look.brightness.value = 0.9 + nightness * 0.9

  const width = Math.min(MAX_WIDTH, MAX_HEIGHT * look.aspect)
  const height = width / look.aspect

  return (
    <group position={[0, HANG_HEIGHT, WALL_FACE]}>
      <mesh position={[0, 0, 0.03]} material={look.material} userData={NO_BAKE}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}
