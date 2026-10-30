import { ObjectMesh } from "../objects/ObjectMesh"
import type { ObjectType } from "../types"

interface Props {
  type: ObjectType
  x: number
  z: number
  rotation: number
}

/** Live, non-interactive preview of what the active build tool will place. */
export const Placement = ({ type, x, z, rotation }: Props) => (
  <group>
    {/* Highlighted target cell */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
      <planeGeometry args={[0.94, 0.94]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.22} toneMapped={false} />
    </mesh>
    {/* Preview of the object */}
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <ObjectMesh type={type} />
    </group>
  </group>
)
