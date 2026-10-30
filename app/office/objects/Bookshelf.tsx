import { PALETTE } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { FLUSH_INSET } from "~/editor/objects/dimensions"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 1.2
const DEPTH = 0.35
const HEIGHT = 1.8
const THICKNESS = 0.06

const BOOK_COLORS = ["#b96f6f", "#6d90c9", "#7fa66a", "#e8c07a", "#8b7fb0", "#5f8a86"]

/** A bookshelf with shelves and a few rows of colourful books. */
export const Bookshelf = ({ color = PALETTE.deskLeg }: Props) => {
  const shelfYs = [0, HEIGHT * 0.28, HEIGHT * 0.55, HEIGHT - THICKNESS] // shelf board bottoms
  const bookShelfYs = [HEIGHT * 0.28, HEIGHT * 0.55] // shelves that hold books

  return (
    <group>
      {/* Back panel */}
      <RoundedBox
        // Just inside the sides' back, top and end faces (FLUSH_INSET).
        args={[WIDTH - 2 * FLUSH_INSET, HEIGHT - FLUSH_INSET, 0.04]}
        radius={0.02}
        smoothness={3}
        position={[0, (HEIGHT - FLUSH_INSET) / 2, -DEPTH / 2 + 0.02 + FLUSH_INSET]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.7} />
      </RoundedBox>
      {/* Sides */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[THICKNESS, HEIGHT, DEPTH]}
          radius={0.02}
          smoothness={3}
          position={[side * (WIDTH / 2 - THICKNESS / 2), HEIGHT / 2, 0]}
          castShadow
        >
          <Surface color={color} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* Shelves */}
      {shelfYs.map((y, i) => (
        <RoundedBox
          key={i}
          args={[WIDTH - THICKNESS * 2, THICKNESS, DEPTH - 0.03]}
          radius={0.01}
          smoothness={2}
          position={[0, y + THICKNESS / 2, 0]}
          castShadow
        >
          <Surface color={color} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* Books */}
      {bookShelfYs.map((shelfY) =>
        BOOK_COLORS.map((bookColor, i) => {
          const bookWidth = 0.12
          const x = -WIDTH / 2 + THICKNESS + 0.08 + i * (bookWidth + 0.02)
          const bookHeight = 0.26 + (i % 3) * 0.03

          return (
            <mesh
              key={`${shelfY}-${i}`}
              position={[x, shelfY + THICKNESS + bookHeight / 2, 0]}
              castShadow
            >
              <boxGeometry args={[bookWidth, bookHeight, DEPTH - 0.1]} />
              <Surface color={bookColor} roughness={0.8} />
            </mesh>
          )
        })
      )}
    </group>
  )
}
