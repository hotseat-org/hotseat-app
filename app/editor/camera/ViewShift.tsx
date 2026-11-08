import { useThree } from "@react-three/fiber"
import { useLayoutEffect } from "react"

/**
 * Moves the picture's centre right by `shift` px, for a column of text on the
 * left: the camera renders a window offset to the left of the full view, so the
 * orbit target — and whatever the camera looks at — sits in the free space.
 * It's in the projection, so picking, labels and panning all follow, and it
 * costs nothing per frame.
 */
export const ViewShift = ({ shift }: { shift: number }) => {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    camera.setViewOffset(width, height, -shift, 0, width, height)
    invalidate()

    return () => {
      camera.clearViewOffset()
      invalidate()
    }
  }, [camera, width, height, shift, invalidate])

  return null
}
