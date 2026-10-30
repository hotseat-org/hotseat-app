import { look } from "../looks"
import { WALL_FACE } from "../wallItem"
import { ACCENT } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 1.3
const HEIGHT = 0.74
const HANG_HEIGHT = 0.84

/** What's on screen per look: a dashboard, a video call, or off. */
const SCREENS: { bg: string; glow: number; tiles: [number, number, number, number, string][] }[] = [
  {
    bg: "#1d2a3a",
    glow: 0.35,
    tiles: [
      [-0.36, 0.14, 0.44, 0.26, "#3f7fb8"],
      [0.2, 0.14, 0.56, 0.26, "#3a9b7a"],
      [-0.08, -0.16, 1.0, 0.22, "#8a6fc0"],
    ],
  },
  {
    bg: "#23262e",
    glow: 0.3,
    tiles: [
      [-0.3, 0.15, 0.56, 0.3, "#6d90c9"],
      [0.3, 0.15, 0.56, 0.3, "#c0876a"],
      [-0.3, -0.18, 0.56, 0.3, "#7fa66a"],
      [0.3, -0.18, 0.56, 0.3, "#b96f6f"],
    ],
  },
  { bg: "#14171d", glow: 0, tiles: [] },
]

/** A wall-mounted display. Its look picks what's on screen (or that it's off). */
export const WallTv = ({ color = "#2c313c", variant }: Props) => {
  const screen = SCREENS[look(variant, SCREENS.length)]

  return (
    <group position={[0, HANG_HEIGHT, WALL_FACE]}>
      <RoundedBox
        args={[WIDTH, HEIGHT, 0.05]}
        radius={0.015}
        smoothness={2}
        position={[0, 0, 0.025]}
        castShadow
      >
        <Surface color={color} roughness={0.4} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0505]}>
        <planeGeometry args={[WIDTH - 0.06, HEIGHT - 0.06]} />
        <Surface
          color={screen.bg}
          roughness={0.2}
          emissive={screen.glow ? screen.bg : undefined}
          emissiveIntensity={screen.glow}
        />
      </mesh>
      {screen.tiles.map(([x, y, width, height, tileColor], i) => (
        <mesh key={i} position={[x, y, 0.051]}>
          <planeGeometry args={[width, height]} />
          <Surface
            color={tileColor}
            emissive={tileColor}
            emissiveIntensity={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* A tiny status light */}
      <mesh position={[WIDTH / 2 - 0.05, -HEIGHT / 2 + 0.02, 0.051]}>
        <planeGeometry args={[0.012, 0.012]} />
        <Surface
          color={screen.glow ? ACCENT : "#c9564f"}
          emissive={screen.glow ? ACCENT : "#c9564f"}
        />
      </mesh>
    </group>
  )
}
