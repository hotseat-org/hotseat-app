import { Component, type ReactNode } from "react"
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing"
import { ToneMappingMode } from "postprocessing"

/** Renders children, or nothing if a post-processing pass throws — so a bad
 *  effect degrades to "no post-fx" instead of blanking the whole canvas. */
class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface Props {
  /** Display mode adds heavier ambient occlusion. */
  highQuality?: boolean
}

/**
 * Post-processing. Bloom (neon glow) + vignette + ACES tone mapping run in both
 * modes so the synthwave look is consistent; display mode adds N8AO ambient
 * occlusion. Wrapped in a boundary so a failed pass degrades gracefully.
 */
export const PostFx = ({ highQuality = false }: Props) => (
  <SilentBoundary>
    <EffectComposer multisampling={4} enableNormalPass={false}>
      {highQuality ? (
        <N8AO
          halfRes
          aoRadius={1.6}
          intensity={1.3}
          distanceFalloff={1}
          color="#0a0714"
          quality="medium"
        />
      ) : (
        <></>
      )}
      {/* Subtle — only bright accents (the monitor) glow; not a synthwave wash. */}

      <Bloom
        mipmapBlur
        luminanceThreshold={0.95}
        luminanceSmoothing={0.2}
        intensity={0.35}
        radius={0.6}
      />
      <Vignette eskil={false} offset={0.35} darkness={0.4} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  </SilentBoundary>
)
