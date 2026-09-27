import type { Cell } from "../types"

/** A flat disc marking the grid node a wall run snaps from / to. */
export const NodeMarker = ({ x, z, color = "#3b82f6" }: Cell & { color?: string }) => (
  <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
    <circleGeometry args={[0.16, 24]} />
    <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
  </mesh>
)
