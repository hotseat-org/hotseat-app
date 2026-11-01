import { useEffect, useMemo } from "react"
import { useThree } from "@react-three/fiber"
import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Vector3,
} from "three"
import { PMREMGenerator, type WebGPURenderer } from "three/webgpu"

/** The studio's lights: soft panels round the origin, each facing it. */
const PANELS = [
  { shape: "rect", intensity: 3, color: "#fff3e0", position: [0, 6, -4], scale: [12, 8] },
  { shape: "rect", intensity: 1.2, color: "#d6e0ff", position: [-6, 4, 3], scale: [8, 8] },
  { shape: "ring", intensity: 1.5, color: "#ffffff", position: [6, 5, 4], scale: [5, 5] },
] as const

/** The studio, as a scene of glowing panels (baked once into the environment). */
const createStudio = () => {
  const studio = new Scene()
  for (const panel of PANELS) {
    const geometry =
      panel.shape === "rect" ? new PlaneGeometry(1, 1) : new RingGeometry(0.25, 0.5, 64)
    const material = new MeshBasicMaterial({
      color: new Color(panel.color).multiplyScalar(panel.intensity),
      side: DoubleSide,
      toneMapped: false,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(panel.position[0], panel.position[1], panel.position[2])
    mesh.scale.set(panel.scale[0], panel.scale[1], 1)
    mesh.lookAt(new Vector3())
    studio.add(mesh)
  }

  return studio
}

const disposeStudio = (studio: Scene) =>
  studio.traverse((object) => {
    if (!(object instanceof Mesh)) return

    object.geometry.dispose()
    ;(object.material as MeshBasicMaterial).dispose()
  })

/**
 * Subtle image-based lighting for display mode: soft studio reflections and
 * sheen on the rounded surfaces. Built from glowing panels (no external HDR
 * fetch), baked once into a prefiltered environment map on the GPU (WebGPU's
 * PMREM), and kept low-intensity so it complements — rather than washes out —
 * the tuned key/fill lighting.
 */
export const StudioEnvironment = ({ intensity = 0.3 }: { intensity?: number }) => {
  const renderer = useThree((state) => state.gl) as unknown as WebGPURenderer
  const scene = useThree((state) => state.scene)
  const environment = useMemo(() => {
    const studio = createStudio()
    const generator = new PMREMGenerator(renderer)
    const target = generator.fromScene(studio, 0, 0.1, 100, { size: 256 })
    generator.dispose()
    disposeStudio(studio)

    return target
  }, [renderer])
  useEffect(() => {
    scene.environment = environment.texture

    return () => {
      scene.environment = null
      environment.dispose()
    }
  }, [scene, environment])
  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  return null
}
