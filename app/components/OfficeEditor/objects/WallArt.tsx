import { Surface } from "./Surface"
import { look } from "./looks"
import { WALL_FACE } from "./wallItem"

interface Props {
  /** Frame colour. */
  color?: string
  variant?: number
}

const W = 0.72
const H = 0.52
const Y = 0.86
const F = 0.035

type Shape = ["rect" | "circle", number, number, number, number, string]

/** A few abstract compositions (one per look). */
const ARTS: { bg: string; shapes: Shape[] }[] = [
  {
    bg: "#f3ead8",
    shapes: [
      ["circle", 0.12, 0.05, 0.12, 0, "#e9876a"],
      ["rect", -0.14, -0.08, 0.26, 0.14, "#5f8a86"],
      ["rect", 0.0, -0.17, 0.6, 0.03, "#3d4657"],
    ],
  },
  {
    bg: "#d8e4ea",
    shapes: [
      ["rect", 0, -0.08, 0.64, 0.28, "#6d90c9"],
      ["rect", 0, -0.14, 0.64, 0.16, "#3f6a9a"],
      ["circle", 0.18, 0.1, 0.07, 0, "#f7df7a"],
    ],
  },
  {
    bg: "#efe2dc",
    shapes: [
      ["rect", -0.18, 0.02, 0.18, 0.34, "#b96f6f"],
      ["rect", 0.02, -0.04, 0.14, 0.22, "#e8c07a"],
      ["rect", 0.2, 0.06, 0.12, 0.3, "#7fa66a"],
    ],
  },
]

/** A framed abstract print. Its look picks the artwork. */
export const WallArt = ({ color = "#c9946a", variant }: Props) => {
  const art = ARTS[look(variant, ARTS.length)]
  return (
    <group position={[0, Y, WALL_FACE]}>
      {/* Frame: the sides fit between the top and bottom bars — overlapping
          at the corners, their faces would share a plane and flicker */}
      {[
        [0, H / 2 - F / 2, W, F],
        [0, -H / 2 + F / 2, W, F],
        [-W / 2 + F / 2, 0, F, H - F * 2],
        [W / 2 - F / 2, 0, F, H - F * 2],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.02]} castShadow>
          <boxGeometry args={[w, h, 0.04]} />
          <Surface color={color} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[W - F * 2, H - F * 2]} />
        <Surface color={art.bg} roughness={0.8} />
      </mesh>
      {art.shapes.map(([kind, x, y, a, b, c], i) => (
        <mesh key={i} position={[x, y, 0.014 + i * 0.001]}>
          {kind === "circle" ? <circleGeometry args={[a, 24]} /> : <planeGeometry args={[a, b]} />}
          <Surface color={c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}
