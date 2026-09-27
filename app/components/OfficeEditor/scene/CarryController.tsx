import { useFrame, useThree } from "@react-three/fiber"
import { useMemo } from "react"
import { Plane, Vector3 } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { clampToFloor, snapToFootprint, wallMount } from "../layout"
import { isWallMounted } from "../types"
import { aimAtWallHeight } from "./wallAim"

const GROUND = new Plane(new Vector3(0, 1, 0), 0)

/**
 * Moves the carried object to follow the cursor, tracked against a math ground
 * plane every frame — so it keeps following even when the cursor passes over
 * other objects or the carried object itself (which would otherwise swallow the
 * ground's pointer-move events).
 */
export const CarryController = ({ carryId }: { carryId: string | null }) => {
  const { camera, raycaster, pointer } = useThree()
  const store = useEditorStoreApi()
  const moveObject = useEditorStore((s) => s.moveObject)
  const hit = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    if (!carryId) return
    const o = store.getState().objects.find((obj) => obj.id === carryId)
    if (!o) return
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(GROUND, hit)) return
    // Wall items hop along wall faces (turning to face out); off a wall they
    // follow the cursor and can't be dropped.
    const all = store.getState().objects
    const aim = isWallMounted(o.type) ? aimAtWallHeight(raycaster, pointer, camera) : null
    const p = (aim && wallMount(all, o.type, aim.x, aim.z)) || {
      ...clampToFloor(o.type, o.rotation, snapToFootprint(o.type, o.rotation, hit.x, hit.z)),
      rotation: o.rotation,
    }
    if (p.x !== o.x || p.z !== o.z || p.rotation !== o.rotation)
      moveObject(carryId, p.x, p.z, p.rotation)
    state.invalidate() // keep following under frameloop="demand"
  })

  return null
}
