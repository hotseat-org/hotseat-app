import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { FLUSH_INSET } from "./dimensions"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 1.2
const D = 0.35
const H = 1.8
const T = 0.06

const BOOK_COLORS = ["#b96f6f", "#6d90c9", "#7fa66a", "#e8c07a", "#8b7fb0", "#5f8a86"]

/** A bookshelf with shelves and a few rows of colourful books. */
export const Bookshelf = ({ color = PALETTE.deskLeg }: Props) => {
  const shelfYs = [0, H * 0.28, H * 0.55, H - T] // shelf board bottoms
  const bookShelfYs = [H * 0.28, H * 0.55] // shelves that hold books

  return (
    <group>
      {/* Back panel */}
      <RoundedBox
        // Just inside the sides' back, top and end faces (FLUSH_INSET).
        args={[W - 2 * FLUSH_INSET, H - FLUSH_INSET, 0.04]}
        radius={0.02}
        smoothness={3}
        position={[0, (H - FLUSH_INSET) / 2, -D / 2 + 0.02 + FLUSH_INSET]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.7} />
      </RoundedBox>
      {/* Sides */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[T, H, D]}
          radius={0.02}
          smoothness={3}
          position={[s * (W / 2 - T / 2), H / 2, 0]}
          castShadow
        >
          <Surface color={color} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* Shelves */}
      {shelfYs.map((y, i) => (
        <RoundedBox
          key={i}
          args={[W - T * 2, T, D - 0.03]}
          radius={0.01}
          smoothness={2}
          position={[0, y + T / 2, 0]}
          castShadow
        >
          <Surface color={color} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* Books */}
      {bookShelfYs.map((shelfY) =>
        BOOK_COLORS.map((c, i) => {
          const bw = 0.12
          const x = -W / 2 + T + 0.08 + i * (bw + 0.02)
          const bh = 0.26 + (i % 3) * 0.03
          return (
            <mesh key={`${shelfY}-${i}`} position={[x, shelfY + T + bh / 2, 0]} castShadow>
              <boxGeometry args={[bw, bh, D - 0.1]} />
              <Surface color={c} roughness={0.8} />
            </mesh>
          )
        })
      )}
    </group>
  )
}
