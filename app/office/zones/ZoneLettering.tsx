import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { CanvasTexture, Color, LinearFilter, type Group, Vector3 } from "three"
import { float, texture, uniform } from "three/tsl"
import { MeshBasicNodeMaterial } from "three/webgpu"
import type { ZoneLetters } from "./zoneLetters"
import type { Zone } from "./zones"

/** Just above the zone's tint (0.009). */
const HEIGHT = 0.011
/** How strong the letters are: a floor marking, not a sign. */
const OPACITY = { light: 0.62, dark: 0.5 }
/**
 * Where furniture stands in front of a name (from the view's angle), it shows
 * through it this faintly (a share of its strength): never cut off.
 */
const THROUGH = 0.38
/** A name lettered under its zone's furniture (no clear floor by it) shows through it this much. */
const UNDER_FURNITURE = 0.8
/** The texture's letters (px): sharp from afar and close. */
const FONT_SIZE = 96
const FONT = `900 ${FONT_SIZE}px Nunito, ui-rounded, system-ui, sans-serif`

/** Once the page's fonts have loaded (Nunito): the letters are measured and drawn again in it. */
export const useFontsReady = () => {
  const [isReady, setIsReady] = useState(
    () => typeof document === "undefined" || document.fonts.status === "loaded"
  )
  useEffect(() => {
    if (isReady) return

    let isCurrent = true
    void document.fonts.ready.then(() => isCurrent && setIsReady(true))

    return () => {
      isCurrent = false
    }
  }, [isReady])

  return isReady
}

/** Letters' height in a name's texture, as a share of its font size. */
const LINE = 1.3
/** Spacing between letters, as a share of the font size. */
const SPACING = 0.14

/** A name's texture size (px), in spaced capitals: its letters' run, and room at the ends. */
const measureName = (context: CanvasRenderingContext2D, text: string) => {
  context.font = FONT

  return {
    width:
      Math.ceil(context.measureText(text).width + FONT_SIZE * SPACING * text.length) +
      FONT_SIZE / 2,
    height: Math.ceil(FONT_SIZE * LINE),
  }
}

const aspectOf = new Map<string, number>()

/**
 * A name's width on the floor per metre of its letters' height — as it's
 * drawn, so where it's placed it fits (see placeZoneLetters).
 */
export const measureNameAspect = (name: string) => {
  const known = aspectOf.get(name)
  if (known) return known

  const context = document.createElement("canvas").getContext("2d")!
  const { width, height } = measureName(context, name.toLocaleUpperCase())
  const aspect = width / height
  // Kept once the page's own font is in (measured before, it's a stand-in's).
  if (document.fonts.status === "loaded") aspectOf.set(name, aspect)

  return aspect
}

/** A name in spaced capitals, white on clear (the material colours it): its texture. */
const drawName = (name: string) => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  const text = name.toLocaleUpperCase()
  const spacing = FONT_SIZE * SPACING
  const { width, height } = measureName(context, text)
  canvas.width = width
  canvas.height = height
  context.font = FONT
  context.letterSpacing = `${spacing}px`
  context.fillStyle = "#ffffff"
  context.textBaseline = "middle"
  context.textAlign = "center"
  context.fillText(text, canvas.width / 2 + spacing / 2, canvas.height / 2)
  const map = new CanvasTexture(canvas)
  map.minFilter = LinearFilter
  map.generateMipmaps = false

  return map
}

/**
 * How far to turn the letters so their top points away from the viewer.
 * Unturned, their top points to −z (along x); turned a quarter, to −x (along z).
 */
const getTurn = (isAlongX: boolean, forward: Vector3) => {
  if (isAlongX) return forward.z < 0 ? 0 : Math.PI

  return forward.x < 0 ? Math.PI / 2 : -Math.PI / 2
}

/**
 * A zone's name lettered on its floor, like a district on a map: big, spaced
 * and faint, in its colour, under the desks and people — it never covers
 * them. It runs along the zone's longer side and turns to stay readable as
 * the view goes round.
 */
export const ZoneLettering = ({
  zone,
  letters,
  isDark,
}: {
  zone: Zone
  letters: ZoneLetters
  isDark: boolean
}) => {
  const isFontReady = useFontsReady()
  const look = useMemo(() => {
    const map = drawName(zone.name)
    const opacity = uniform(OPACITY.light)
    const throughShare = uniform(THROUGH)
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    const color = uniform(new Color(zone.color))
    material.colorNode = color
    material.opacityNode = texture(map).a.mul(opacity)
    material.maskNode = texture(map).a.greaterThan(float(0.01))
    // Its ghost, drawn over whatever hides it.
    const through = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
    through.colorNode = material.colorNode
    through.opacityNode = texture(map).a.mul(opacity).mul(throughShare)
    through.maskNode = material.maskNode

    return { map, material, through, opacity, throughShare, color }
    // Redrawn in the page's font once it's loaded.
  }, [zone.name, zone.color, isFontReady])
  useEffect(() => {
    look.opacity.value = OPACITY[isDark ? "dark" : "light"]
    look.throughShare.value = letters.isUnderFurniture ? UNDER_FURNITURE : THROUGH
    // A step off the zone's own colour (lighter at night, darker by day): it
    // stands out from the zone's tint under it.
    look.color.value
      .set(zone.color)
      .lerp(new Color(isDark ? "#ffffff" : "#000000"), isDark ? 0.4 : 0.25)
  }, [look, isDark, zone.color, letters.isUnderFurniture])
  useEffect(
    () => () => {
      look.map.dispose()
      look.material.dispose()
      look.through.dispose()
    },
    [look]
  )

  // Its top towards the far side of the view: readable whichever way it turns.
  const group = useRef<Group>(null)
  const forward = useMemo(() => new Vector3(), [])
  useFrame(({ camera }) => {
    if (!group.current) return

    camera.getWorldDirection(forward)
    const angle = getTurn(letters.isAlongX, forward)
    if (group.current.rotation.y !== angle) group.current.rotation.y = angle
  })

  return (
    <group ref={group} position={[letters.x, HEIGHT, letters.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={look.material} renderOrder={2}>
        <planeGeometry args={[letters.width, letters.height]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={look.through} renderOrder={3}>
        <planeGeometry args={[letters.width, letters.height]} />
      </mesh>
    </group>
  )
}
