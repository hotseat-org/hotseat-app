import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { HEAT_BAR, heatColor } from "../heatmap"
import { isSeatable } from "../catalog"
import { useSurfaces } from "~/editor/sceneTheme"
import { useEditorStore } from "~/editor/store"
import { markShadowsDirty } from "~/editor/scene/shadows"

/** How long a bar takes to grow (s), and the stagger between desks. */
const GROW = 0.7
const STAGGER = 0.04
/** The plate under each bar: the "0" every bar stands on. */
const PLATE = { width: 0.62, height: 0.04 }

const easeOut = (progress: number) => 1 - (1 - progress) ** 3

/** A column's instance matrix: on its plate, `grown` (0–1) of its full height. */
const columnMatrix = (
  matrix: THREE.Matrix4,
  bar: { x: number; z: number; height: number },
  grown: number
) =>
  matrix
    .makeScale(1, bar.height * grown, 1)
    .setPosition(bar.x, HEAT_BAR.base + PLATE.height / 2, bar.z)

/** A column of unit height standing on y = 0 (instances scale it to their share). */
const columnGeometry = () =>
  new RoundedBoxGeometry(HEAT_BAR.width, 1, HEAT_BAR.width, 3, 0.05).translate(0, 0.5, 0)

/**
 * Lit by its instance colour — and glowing in it: the emissive takes each
 * bar's own colour, so they stay orange at any time of day (dark mode: bright
 * enough for the bloom).
 */
const columnMaterial = (isDark: boolean) => {
  const material = new THREE.MeshStandardMaterial({
    emissive: "#ffffff",
    emissiveIntensity: isDark ? 0.55 : 0.45,
    roughness: 0.55,
    toneMapped: !isDark,
  })
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;"
    )
  }
  return material
}

/**
 * The heatmap as a bar chart over the office (Insights): a column over each
 * desk, as tall and as warm as its share of days in use. Grows in when shown.
 * Every column in one draw, every plate in another. View mode only.
 */
export const HeatBars = () => {
  const heatmap = useEditorStore((state) => state.heatmap)
  const objects = useEditorStore((state) => state.objects)
  const isDark = useSurfaces().nightDepth === 0
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  const bars = useMemo(() => {
    if (!heatmap) return []
    return objects
      .filter((object) => isSeatable(object.type) && object.id in heatmap.ratios)
      .map((object, i) => ({
        x: object.x,
        z: object.z,
        delay: i * STAGGER,
        height: 0.06 + heatmap.ratios[object.id] * HEAT_BAR.maxHeight,
        color: new THREE.Color(heatColor(heatmap.ratios[object.id], isDark)),
      }))
  }, [heatmap, objects, isDark])

  const geometry = useMemo(
    () => ({
      column: columnGeometry(),
      plate: new RoundedBoxGeometry(PLATE.width, PLATE.height, PLATE.width, 2, 0.018),
    }),
    []
  )
  const material = useMemo(
    () => ({
      column: columnMaterial(isDark),
      plate: new THREE.MeshStandardMaterial({
        color: heatColor(0, isDark),
        transparent: true,
        opacity: 0.85,
        roughness: 0.8,
      }),
    }),
    [isDark]
  )
  useEffect(
    () => () => {
      geometry.column.dispose()
      geometry.plate.dispose()
    },
    [geometry]
  )
  useEffect(
    () => () => {
      material.column.dispose()
      material.plate.dispose()
    },
    [material]
  )

  const columns = useRef<THREE.InstancedMesh>(null)
  const plates = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  // Set before the first frame (growth starts on the heatmap's effect below).
  const isGrowing = useRef(true)
  // Colours and plates are set once per heatmap; the columns' heights animate.
  useLayoutEffect(() => {
    const columnMesh = columns.current
    const plateMesh = plates.current
    if (!columnMesh || !plateMesh) return
    bars.forEach((bar, i) => {
      columnMesh.setColorAt(i, bar.color)
      plateMesh.setMatrixAt(i, matrix.makeTranslation(bar.x, HEAT_BAR.base, bar.z))
      // Not growing (the theme changed: new meshes): straight to full height.
      if (!isGrowing.current) columnMesh.setMatrixAt(i, columnMatrix(matrix, bar, 1))
    })
    if (columnMesh.instanceColor) columnMesh.instanceColor.needsUpdate = true
    columnMesh.instanceMatrix.needsUpdate = true
    plateMesh.instanceMatrix.needsUpdate = true
  }, [bars, matrix])

  // Grow in each time the heatmap changes (not when only the theme does).
  const startedAt = useRef<number | null>(null)
  useEffect(() => {
    startedAt.current = null
    isGrowing.current = true
    invalidate()
  }, [heatmap, invalidate])
  const duration = GROW + bars.length * STAGGER
  useFrame(({ clock }) => {
    const columnMesh = columns.current
    if (!columnMesh || !isGrowing.current) return
    startedAt.current ??= clock.elapsedTime
    const elapsed = clock.elapsedTime - startedAt.current
    bars.forEach((bar, i) => {
      const grown = Math.max(0.001, easeOut(Math.min(1, (elapsed - bar.delay) / GROW)))
      columnMesh.setMatrixAt(i, columnMatrix(matrix, bar, grown))
    })
    columnMesh.instanceMatrix.needsUpdate = true
    // frameloop="demand": keep frames coming until every bar has grown — then
    // the (cached) shadows once, with the bars at full height.
    if (elapsed < duration) invalidate()
    else {
      isGrowing.current = false
      markShadowsDirty(renderer, invalidate)
    }
  })

  if (!bars.length) return null
  return (
    <group raycast={() => null}>
      <instancedMesh
        ref={plates}
        args={[geometry.plate, material.plate, bars.length]}
        frustumCulled={false}
        raycast={() => null}
      />
      <instancedMesh
        ref={columns}
        args={[geometry.column, material.column, bars.length]}
        castShadow
        frustumCulled={false}
        raycast={() => null}
      />
    </group>
  )
}
