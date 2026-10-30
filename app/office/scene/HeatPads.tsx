import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { heatColor } from "../heatmap"
import { isSeatable } from "../catalog"
import { footprintCells } from "~/editor/layout"
import { useSurfaces } from "~/editor/sceneTheme"
import { useEditorStore } from "~/editor/store"
import { GRID } from "~/editor/types"

/** On the floor, under the furniture and above the floor paint. */
const HEIGHT = 0.018
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
  const heatmap = useEditorStore((state) => state.heatmap)
  const objects = useEditorStore((state) => state.objects)
  const isDark = useSurfaces().nightDepth === 0
  const invalidate = useThree((state) => state.invalidate)
  const material = useMemo(padMaterial, [])
  useEffect(() => () => material.dispose(), [material])

  const pads = useMemo(() => {
    if (!heatmap) return []

    return objects
      .filter((object) => isSeatable(object.type) && object.id in heatmap.ratios)
      .map((object) => {
        const [cellsX, cellsZ] = footprintCells(object.type, object.rotation)
        const ratio = heatmap.ratios[object.id]

        return {
          x: object.x,
          z: object.z,
          width: cellsX * GRID + MARGIN * 2,
          depth: cellsZ * GRID + MARGIN * 2,
          color: new THREE.Color(heatColor(ratio, isDark)),
          // Dark: the busiest desks bright enough for the bloom to make them glow.
          glow: isDark ? 1 + ratio * 0.8 : 1,
        }
      })
  }, [heatmap, objects, isDark])

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    plane.rotateX(-Math.PI / 2)
    plane.setAttribute(
      "padSize",
      new THREE.InstancedBufferAttribute(new Float32Array(pads.length * 2), 2)
    )
    plane.setAttribute(
      "padColor",
      new THREE.InstancedBufferAttribute(new Float32Array(pads.length * 3), 3)
    )
    plane.setAttribute(
      "padGlow",
      new THREE.InstancedBufferAttribute(new Float32Array(pads.length), 1)
    )

    return plane
  }, [pads.length])
  useEffect(() => () => geometry.dispose(), [geometry])

  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const padMesh = mesh.current
    if (!padMesh) return

    const size = geometry.getAttribute("padSize") as THREE.InstancedBufferAttribute
    const color = geometry.getAttribute("padColor") as THREE.InstancedBufferAttribute
    const glow = geometry.getAttribute("padGlow") as THREE.InstancedBufferAttribute
    const matrix = new THREE.Matrix4()
    pads.forEach((pad, i) => {
      padMesh.setMatrixAt(
        i,
        matrix.makeScale(pad.width, 1, pad.depth).setPosition(pad.x, HEIGHT, pad.z)
      )
      size.setXY(i, pad.width, pad.depth)
      color.setXYZ(i, pad.color.r, pad.color.g, pad.color.b)
      glow.setX(i, pad.glow)
    })
    padMesh.instanceMatrix.needsUpdate = true
    size.needsUpdate = color.needsUpdate = glow.needsUpdate = true
    padMesh.computeBoundingSphere()
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
