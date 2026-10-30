import { getRenderer, type MeshProps } from "../catalog/rendering"
import type { ObjectType } from "../types"

interface Props extends MeshProps {
  type: ObjectType
}

/** Pure, non-interactive geometry for an object type. */
export const ObjectMesh = ({ type, ...props }: Props) => {
  const { Mesh } = getRenderer(type)

  return <Mesh {...props} />
}
