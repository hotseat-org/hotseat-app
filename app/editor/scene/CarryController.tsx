import { useFrame, useThree } from "@react-three/fiber"
import { useMemo } from "react"
import { Plane, Vector3 } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { snapPlacement, wallMount } from "../layout"
import { isWallMounted } from "../types"
import { aimAtWallHeight } from "./wallAim"

const GROUND = new Plane(new Vector3(0, 1, 0), 0)

/**
 * Moves the dragged object to follow the cursor (held by the spot it was
 * grabbed at: `grab` is that spot's offset from its centre), tracked against a math ground
 * plane every frame — so it keeps following even when the cursor passes over
 * other objects or the carried object itself (which would otherwise swallow the
 * ground's pointer-move events).
 */
export const CarryController = ({
  carryId,
  grab,
}: {
  carryId: string | null
  grab: { dx: number; dz: number }
}) => {
  const { camera, raycaster, pointer } = useThree()
  const store = useEditorStoreApi()
  const moveObject = useEditorStore((state) => state.moveObject)
  const hit = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    if (!carryId) return
    const carried = store.getState().objects.find((object) => object.id === carryId)
    if (!carried) return
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(GROUND, hit)) return
    // Wall items hop along wall faces (turning to face out); off a wall they
    // follow the cursor and can't be dropped.
    const all = store.getState().objects
    const aim = isWallMounted(carried.type) ? aimAtWallHeight(raycaster, pointer, camera) : null
    const placement = (aim && wallMount(all, carried.type, aim.x, aim.z)) || {
      // Flush against a diagonal wall when turned beside one (see snapPlacement).
      ...snapPlacement(
        all.filter((other) => other.id !== carried.id),
        carried.type,
        carried.rotation,
        hit.x + grab.dx,
        hit.z + grab.dz
      ),
      rotation: carried.rotation,
    }
    if (
      placement.x !== carried.x ||
      placement.z !== carried.z ||
      placement.rotation !== carried.rotation
    )
      moveObject(carryId, placement.x, placement.z, placement.rotation)
    state.invalidate() // keep following under frameloop="demand"
  })

  return null
}
