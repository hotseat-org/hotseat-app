import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { heatColor } from "../heatmap"
import { footprintCells } from "../layout"
import { useSurfaces } from "../sceneTheme"
import { useEditorStore } from "../store"
import { GRID, isSeatable } from "../types"

/** On the floor, under the furniture and above the floor paint. */
const Y = 0.018
/** How far a pad reaches past its desk (m). */
const MARGIN = 0.3

/**
 * A soft-edged rounded rectangle, one per instance: its size (m), colour and
 * glow come from instance attributes — every pad in one draw.
 */
const padMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute vec2 padSize;
      attribute vec3 padColor;
      attribute float padGlow;
      varying vec2 vUv;
      varying vec2 vSize;
      varying vec3 vColor;
      void main() {
        vUv = uv;
        vSize = padSize;
        vColor = padColor * padGlow;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec2 vSize;
      varying vec3 vColor;
      void main() {
        // Distance (m) outside a rounded rectangle inset by the soft edge.
        vec2 p = (vUv - 0.5) * vSize;
        vec2 inner = vSize * 0.5 - 0.22; // (not "half": reserved in GLSL)
        vec2 q = abs(p) - inner + 0.12;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.12;
        float a = 1.0 - smoothstep(-0.02, 0.2, d);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a * 0.9);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })

/**
 * The heatmap's floor (Insights): each desk on a pad coloured by how often it
 * was in use in the chosen period. View mode only.
 */
export const HeatPads = () => {
  const heatmap = useEditorStore((s) => s.heatmap)
  const objects = useEditorStore((s) => s.objects)
  const isDark = useSurfaces().nightDepth === 0
  const invalidate = useThree((s) => s.invalidate)
  const material = useMemo(padMaterial, [])
  useEffect(() => () => material.dispose(), [material])

  const pads = useMemo(() => {
    if (!heatmap) return []
    return objects
      .filter((o) => isSeatable(o.type) && o.id in heatmap.ratios)
      .map((o) => {
        const [cx, cz] = footprintCells(o.type, o.rotation)
        const ratio = heatmap.ratios[o.id]
        return {
          x: o.x,
          z: o.z,
          w: cx * GRID + MARGIN * 2,
          d: cz * GRID + MARGIN * 2,
          color: new THREE.Color(heatColor(ratio, isDark)),
          // Dark: the busiest desks bright enough for the bloom to make them glow.
          glow: isDark ? 1 + ratio * 0.8 : 1,
        }
      })
  }, [heatmap, objects, isDark])

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1)
    g.rotateX(-Math.PI / 2)
    g.setAttribute(
      "padSize",
      new THREE.InstancedBufferAttribute(new Float32Array(pads.length * 2), 2)
    )
    g.setAttribute(
      "padColor",
      new THREE.InstancedBufferAttribute(new Float32Array(pads.length * 3), 3)
    )
    g.setAttribute("padGlow", new THREE.InstancedBufferAttribute(new Float32Array(pads.length), 1))
    return g
  }, [pads.length])
  useEffect(() => () => geometry.dispose(), [geometry])

  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const size = geometry.getAttribute("padSize") as THREE.InstancedBufferAttribute
    const color = geometry.getAttribute("padColor") as THREE.InstancedBufferAttribute
    const glow = geometry.getAttribute("padGlow") as THREE.InstancedBufferAttribute
    const matrix = new THREE.Matrix4()
    pads.forEach((p, i) => {
      m.setMatrixAt(i, matrix.makeScale(p.w, 1, p.d).setPosition(p.x, Y, p.z))
      size.setXY(i, p.w, p.d)
      color.setXYZ(i, p.color.r, p.color.g, p.color.b)
      glow.setX(i, p.glow)
    })
    m.instanceMatrix.needsUpdate = true
    size.needsUpdate = color.needsUpdate = glow.needsUpdate = true
    m.computeBoundingSphere()
    invalidate()
  }, [pads, geometry, invalidate])

  if (!pads.length) return null
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, pads.length]}
      renderOrder={2}
      frustumCulled={false}
      raycast={() => null}
    />
  )
}
