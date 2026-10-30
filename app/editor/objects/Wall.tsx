import { useSurfaces } from "../scene/sceneTheme"
import { GRID } from "../types"
import { Surface } from "./Surface"
import { WALL } from "./dimensions"

interface Props {
  color?: string
}

/**
 * A single wall segment spanning one grid edge. Plain (un-rounded) boxes exactly
 * one cell wide, so adjacent segments butt together into one continuous wall with
 * no visible seams; a lighter trim caps the top. Corner posts (see Posts) fill
 * the notch at L-junctions.
 */
export const Wall = ({ color }: Props) => {
  const surfaces = useSurfaces()

  return (
    <mesh position={[0, (WALL.height - WALL.sink) / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[GRID, WALL.height + WALL.sink, WALL.depth]} />
      <Surface color={color ?? surfaces.wall} roughness={0.85} isRecessed />
    </mesh>
  )
}
