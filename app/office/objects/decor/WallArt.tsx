import { look } from "../looks"
import { WALL_FACE } from "../wallItem"
import { Surface } from "~/editor/kit"

interface Props {
  /** Frame colour. */
  color?: string
  variant?: number
}

const WIDTH = 0.72
const HEIGHT = 0.52
const HANG_HEIGHT = 0.86
const FRAME_WIDTH = 0.035

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
    <group position={[0, HANG_HEIGHT, WALL_FACE]}>
      {/* Frame: the sides fit between the top and bottom bars — overlapping
          at the corners, their faces would share a plane and flicker */}
      {[
        [0, HEIGHT / 2 - FRAME_WIDTH / 2, WIDTH, FRAME_WIDTH],
        [0, -HEIGHT / 2 + FRAME_WIDTH / 2, WIDTH, FRAME_WIDTH],
        [-WIDTH / 2 + FRAME_WIDTH / 2, 0, FRAME_WIDTH, HEIGHT - FRAME_WIDTH * 2],
        [WIDTH / 2 - FRAME_WIDTH / 2, 0, FRAME_WIDTH, HEIGHT - FRAME_WIDTH * 2],
      ].map(([x, y, width, height], i) => (
        <mesh key={i} position={[x, y, 0.02]} castShadow>
          <boxGeometry args={[width, height, 0.04]} />
          <Surface color={color} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[WIDTH - FRAME_WIDTH * 2, HEIGHT - FRAME_WIDTH * 2]} />
        <Surface color={art.bg} roughness={0.8} />
      </mesh>
      {art.shapes.map(([kind, x, y, shapeWidth, shapeHeight, shapeColor], i) => (
        <mesh key={i} position={[x, y, 0.014 + i * 0.001]}>
          {kind === "circle" ? (
            <circleGeometry args={[shapeWidth, 24]} />
          ) : (
            <planeGeometry args={[shapeWidth, shapeHeight]} />
          )}
          <Surface color={shapeColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}
