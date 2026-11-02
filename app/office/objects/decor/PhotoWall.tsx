import { look } from "../looks"
import { WALL_FACE } from "../wallItem"
import { Surface } from "~/editor/kit"

interface Props {
  /** The frames. */
  color?: string
  variant?: number
}

const HANG_HEIGHT = 0.86
const FRAME = 0.025

/** A framed photo: where it hangs (x, y), its size, and what's in it. */
type Photo = { x: number; y: number; width: number; height: number; scene: Scene }
/** A photo's sky (or wall), its ground, and the people in it (their tops). */
type Scene = { sky: string; ground: string; people: string[] }

const OUTING: Scene = {
  sky: "#bcd7e6",
  ground: "#7fa66a",
  people: ["#c9564f", "#e8c07a", "#3f6a9a", "#5f8a86"],
}
const PARTY: Scene = {
  sky: "#3d4657",
  ground: "#c9946a",
  people: ["#e9876a", "#f3e4d0", "#8b7fb0"],
}
const BEACH: Scene = { sky: "#d8e4ea", ground: "#e8d2a4", people: ["#3f6a9a", "#c9564f"] }
const OFFICE: Scene = {
  sky: "#efe7db",
  ground: "#c9b48d",
  people: ["#6d90c9", "#5f8a86", "#e8c07a", "#b96f6f", "#3d4657"],
}

/** The arrangements (one per look): a gallery of team photos. */
const GALLERIES: Photo[][] = [
  [
    { x: -0.5, y: 0.08, width: 0.4, height: 0.3, scene: OUTING },
    { x: -0.06, y: 0.14, width: 0.3, height: 0.22, scene: BEACH },
    { x: 0.42, y: 0.04, width: 0.46, height: 0.34, scene: OFFICE },
    { x: -0.1, y: -0.17, width: 0.4, height: 0.24, scene: PARTY },
  ],
  [
    { x: -0.45, y: 0, width: 0.5, height: 0.38, scene: OFFICE },
    { x: 0.12, y: 0.12, width: 0.4, height: 0.24, scene: PARTY },
    { x: 0.12, y: -0.16, width: 0.4, height: 0.24, scene: OUTING },
    { x: 0.53, y: 0, width: 0.24, height: 0.3, scene: BEACH },
  ],
]

/** Team photos in a gallery of frames: outings, parties, the whole office. */
export const PhotoWall = ({ color = "#3d4657", variant }: Props) => {
  const photos = GALLERIES[look(variant, GALLERIES.length)]

  return (
    <group position={[0, HANG_HEIGHT, WALL_FACE]}>
      {photos.map(({ x, y, width, height, scene }, i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh position={[0, 0, 0.012]} castShadow>
            <boxGeometry args={[width, height, 0.024]} />
            <Surface color={color} roughness={0.6} />
          </mesh>
          <mesh position={[0, height * 0.12, 0.025]}>
            <planeGeometry args={[width - FRAME * 2, height * 0.76 - FRAME * 2]} />
            <Surface color={scene.sky} roughness={0.8} />
          </mesh>
          <mesh position={[0, -height / 2 + FRAME + height * 0.12, 0.025]}>
            <planeGeometry args={[width - FRAME * 2, height * 0.24]} />
            <Surface color={scene.ground} roughness={0.8} />
          </mesh>
          {/* The people: a body and a head each, side by side */}
          {scene.people.map((shirt, j) => {
            const spacing = (width - FRAME * 4) / scene.people.length
            const personX = -width / 2 + FRAME * 2 + spacing * (j + 0.5)
            const size = Math.min(spacing * 0.42, height * 0.14)

            return (
              <group key={j} position={[personX, -height / 2 + FRAME + height * 0.22, 0.026]}>
                <mesh>
                  <circleGeometry args={[size, 12, 0, Math.PI]} />
                  <Surface color={shirt} roughness={0.8} />
                </mesh>
                <mesh position={[0, size * 1.45, 0]}>
                  <circleGeometry args={[size * 0.6, 12]} />
                  <Surface color={j % 2 ? "#e0b48f" : "#a8754f"} roughness={0.8} />
                </mesh>
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}
