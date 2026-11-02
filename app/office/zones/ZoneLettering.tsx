import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { CanvasTexture, Color, LinearFilter, type Group, Vector3 } from "three"
import { float, texture, uniform } from "three/tsl"
import { MeshBasicNodeMaterial } from "three/webgpu"
import { ZONE_LETTER_HEIGHT, type ZoneArea } from "./zones"

/** Just above the zone's tint (0.009). */
const HEIGHT = 0.011
/** The name fills at most this share of its run of floor. */
const FILL = 0.9
/** How strong the letters are: a floor marking, not a sign. */
const OPACITY = { light: 0.62, dark: 0.5 }
/** The texture's letters (px): sharp from afar and close. */
const FONT_SIZE = 96
const FONT = `900 ${FONT_SIZE}px Nunito, ui-rounded, system-ui, sans-serif`

/** Once the page's fonts have loaded (Nunito): the letters are drawn again in it. */
const useFontsReady = () => {
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

/** A name in spaced capitals, white on clear (the material colours it): its texture and shape. */
const drawName = (name: string) => {
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")!
  const text = name.toLocaleUpperCase()
  const spacing = FONT_SIZE * 0.14
  context.font = FONT
  const width = Math.ceil(context.measureText(text).width + spacing * text.length) + FONT_SIZE / 2
  canvas.width = width
  canvas.height = Math.ceil(FONT_SIZE * 1.3)
  context.font = FONT
  context.letterSpacing = `${spacing}px`
  context.fillStyle = "#ffffff"
  context.textBaseline = "middle"
  context.textAlign = "center"
  context.fillText(text, canvas.width / 2 + spacing / 2, canvas.height / 2)
  const map = new CanvasTexture(canvas)
  map.minFilter = LinearFilter
  map.generateMipmaps = false

  return { map, aspect: canvas.width / canvas.height }
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
export const ZoneLettering = ({ area, isDark }: { area: ZoneArea; isDark: boolean }) => {
  const isFontReady = useFontsReady()
  const { zone, floorLabel } = area
  const look = useMemo(() => {
    const { map, aspect } = drawName(zone.name)
    const opacity = uniform(OPACITY.light)
    const material = new MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    material.colorNode = uniform(new Color(zone.color))
    material.opacityNode = texture(map).a.mul(opacity)
    material.maskNode = texture(map).a.greaterThan(float(0.01))
    const height = Math.min(ZONE_LETTER_HEIGHT, (floorLabel.maxWidth * FILL) / aspect)

    return { map, material, opacity, width: height * aspect, height }
    // Redrawn in the page's font once it's loaded.
  }, [zone.name, zone.color, floorLabel.maxWidth, isFontReady])
  useEffect(() => {
    look.opacity.value = OPACITY[isDark ? "dark" : "light"]
  }, [look, isDark])
  useEffect(
    () => () => {
      look.map.dispose()
      look.material.dispose()
    },
    [look]
  )

  // Its top towards the far side of the view: readable whichever way it turns.
  const group = useRef<Group>(null)
  const forward = useMemo(() => new Vector3(), [])
  useFrame(({ camera }) => {
    if (!group.current) return

    camera.getWorldDirection(forward)
    const angle = getTurn(floorLabel.isAlongX, forward)
    if (group.current.rotation.y !== angle) group.current.rotation.y = angle
  })

  return (
    <group ref={group} position={[floorLabel.x, HEIGHT, floorLabel.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={look.material} renderOrder={2}>
        <planeGeometry args={[look.width, look.height]} />
      </mesh>
    </group>
  )
}
