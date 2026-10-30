import { Environment, Lightformer } from "@react-three/drei"

/**
 * Subtle image-based lighting for display mode: soft studio reflections and
 * sheen on the rounded surfaces. Built entirely from Lightformers (no external
 * HDR fetch), baked once, and kept low-intensity so it complements — rather than
 * washes out — the tuned key/fill lighting.
 */
export const StudioEnvironment = ({ intensity = 0.3 }: { intensity?: number }) => (
  <Environment resolution={256} frames={1} environmentIntensity={intensity}>
    <Lightformer
      form="rect"
      intensity={3}
      color="#fff3e0"
      position={[0, 6, -4]}
      scale={[12, 8, 1]}
    />
    <Lightformer
      form="rect"
      intensity={1.2}
      color="#d6e0ff"
      position={[-6, 4, 3]}
      rotation-y={Math.PI / 2}
      scale={[8, 8, 1]}
    />
    <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[6, 5, 4]} scale={5} />
  </Environment>
)
