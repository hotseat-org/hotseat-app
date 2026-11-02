import { useContext, useEffect, useMemo } from "react"
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three"
import { float, texture, uniform } from "three/tsl"
import { MeshBasicNodeMaterial } from "three/webgpu"
import { WALL_FACE } from "../wallItem"
import { useFontsReady } from "../../zones/ZoneLettering"
import { DEFAULT_SIGN_TEXT, DEFAULT_NEON_COLOR } from "../../catalog/neonSign"
import { DaylightContext, GhostContext, NO_BAKE, Surface, usePiece } from "~/editor/kit"

interface Props {
  /** The tubes' colour. */
  color?: string
}

const HANG_HEIGHT = 0.95
/** The most the sign takes on the wall (m): a long text gets smaller letters. */
const MAX_WIDTH = 1.8
const MAX_HEIGHT = 0.42
/** The texture's letters (px), and the room round them the glow spreads into. */
const FONT_SIZE = 120
const GLOW = 36
const FONT = `800 ${FONT_SIZE}px Nunito, ui-rounded, system-ui, sans-serif`

/**
 * The text bent in neon: each letter's outline as a tube in its colour, with
 * a pale core and a soft glow round it, on clear (the canvas's alpha).
 */
const drawNeon = (text: string, color: string) => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  context.font = FONT
  canvas.width = Math.ceil(context.measureText(text).width) + GLOW * 2
  canvas.height = Math.ceil(FONT_SIZE * 1.3) + GLOW * 2

  context.font = FONT
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.lineJoin = "round"
  const centre: [number, number] = [canvas.width / 2, canvas.height / 2]

  // The glow: the tube drawn blurred, twice for strength.
  context.shadowColor = color
  context.shadowBlur = GLOW * 0.8
  context.strokeStyle = color
  context.lineWidth = FONT_SIZE * 0.09
  context.strokeText(text, ...centre)
  context.strokeText(text, ...centre)

  // The core: the gas's light, almost white.
  context.shadowBlur = 0
  context.strokeStyle = "rgba(255, 250, 240, 0.85)"
  context.lineWidth = FONT_SIZE * 0.035
  context.strokeText(text, ...centre)

  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.minFilter = LinearFilter
  map.generateMipmaps = false

  return map
}

/**
 * A neon sign on a clear acrylic panel, saying what's written on it (the
 * Inspector's Sign) in its colour. It glows a little by day, brightly after
 * dark. Its letters aren't baked into the furniture's batches (their
 * texture is the sign's own): one draw call per sign.
 */
export const NeonSign = ({ color = DEFAULT_NEON_COLOR }: Props) => {
  const piece = usePiece()
  const ghost = useContext(GhostContext)
  const nightness = useContext(DaylightContext)
  const isFontReady = useFontsReady()
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
  }, [text, color, isFontReady])
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
      {/* Clear panel, a shade bigger than the letters, on four standoffs */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[width * 0.86, height * 0.72, 0.01]} />
        <Surface color="#dfe8ec" roughness={0.1} metalness={0.2} opacity={0.2} />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((y) => (
          <mesh
            key={`${x}${y}`}
            position={[x * width * 0.4, y * height * 0.3, 0.025]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
            <Surface color="#b9bcc4" roughness={0.3} metalness={0.7} />
          </mesh>
        ))
      )}
      {/* The tubes (not while placing it: its ghost is the panel) */}
      {!ghost && (
        <mesh
          position={[0, 0, 0.06]}
          material={look.material}
          userData={NO_BAKE}
          raycast={() => null}
        >
          <planeGeometry args={[width, height]} />
        </mesh>
      )}
    </group>
  )
}
