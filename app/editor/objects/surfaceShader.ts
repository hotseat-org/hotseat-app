import {
  Fn,
  abs,
  float,
  materialColor,
  materialOpacity,
  mix,
  normalWorld,
  positionWorld,
  select,
  smoothstep,
} from "three/tsl"
import { Material, type MeshStandardMaterial } from "three"
import { MeshStandardNodeMaterial, type Node, type NodeMaterial } from "three/webgpu"
import { CUTAWAYS, CUT_INSIDE_LIGHT, type CutawayKind } from "../walls/cutaway"
import { groundUniform, shownFloorUniform, type FloorPlace } from "./floorHeight"

/**
 * Shading every solid surface gets in its shader, computed per pixel from its
 * height and facing (no textures, no extra passes):
 * - contact: sides darken towards the floor and undersides are shaded, so
 *   furniture sits on the floor instead of floating (what ambient occlusion
 *   does, for free and always on);
 * - a soft vertical gradient on upright faces, darker low, lighter high, so
 *   walls and tall pieces read as solid.
 * Furniture by its height above its own floor; walls and what's in them by
 * their height above the ground, so a building's walls shade as one, storey
 * on storey.
 */
const CONTACT_REACH = 0.3 // m above the floor the darkening fades out
const CONTACT_DARKEST = 0.72
const UNDERSIDE = 0.78
const GRADIENT_LOW = 0.94
const GRADIENT_HIGH = 1.03
const GRADIENT_REACH = 1.6

/** How much a surface's colour is shaded here (×), by its height and facing. */
const getShade = (place: FloorPlace, isInWall: boolean) => {
  const upright = float(1).sub(abs(normalWorld.y))
  const aboveFloor = positionWorld.y.sub(shownFloorUniform).sub(place.base)
  const height = isInWall ? positionWorld.y.sub(groundUniform) : aboveFloor
  const contact = mix(CONTACT_DARKEST, 1, smoothstep(0, CONTACT_REACH, height))
  const gradient = mix(GRADIENT_LOW, GRADIENT_HIGH, smoothstep(0, GRADIENT_REACH, height))
  const shade = mix(1, contact.mul(gradient), upright)

  return select(normalWorld.y.lessThan(-0.5), shade.mul(UNDERSIDE), shade)
}

/** A surface's node props: what its node material (TSL) takes. */
type SurfaceNodes = Partial<
  Pick<MeshStandardNodeMaterial, "colorNode" | "maskNode" | "receivedShadowNode">
>

const cache = new Map<string, SurfaceNodes>()

const SHOWN_FLOOR: FloorPlace = { base: 0 }

/**
 * A Surface's node props: the shading above, plus the wall cutaway when it's
 * sliced by one (and so is in a wall) — on its floor (`place`). Nodes are
 * shared, so materials of one variant share one shader.
 * The cut-open inside of a wall is lit by the ambient alone, a little
 * stronger: the (cached) shadow maps still hold the uncut wall, which would
 * stripe it dark.
 */
export const getSurfaceShader = (cutaway: CutawayKind | null, place = SHOWN_FLOOR) => {
  const id = `${cutaway ?? "plain"}@${place.base}`
  let nodes = cache.get(id)
  if (nodes === undefined) {
    const shade = getShade(place, cutaway !== null)
    const cut = cutaway ? CUTAWAYS[cutaway] : null
    nodes = cut
      ? {
          colorNode: materialColor.mul(shade).mul(select(cut.isCutInside, CUT_INSIDE_LIGHT, 1)),
          maskNode: cut.mask,
          // Glass fades where it's cut, rather than being sliced.
          ...(cut.fade && { opacityNode: materialOpacity.mul(cut.fade) }),
          // Typed without its argument, but three hands it the shadow.
          receivedShadowNode: Fn(([shadow]: [Node<"float">]) =>
            select(cut.isCutInside, float(0), shadow)
          ) as unknown as MeshStandardNodeMaterial["receivedShadowNode"],
        }
      : { colorNode: materialColor.mul(shade) }
    cache.set(id, nodes)
  }

  return nodes
}

/**
 * A copy of a solid's material as a node material, to take a Surface's nodes:
 * a Surface's own as it is; a model's (loaded as a classic material) with
 * its look carried over.
 */
export const copyAsNodeMaterial = (source: Material) => {
  if ((source as NodeMaterial).isNodeMaterial) return source.clone() as MeshStandardNodeMaterial

  const standard = source as MeshStandardMaterial
  const material = new MeshStandardNodeMaterial()
  Material.prototype.copy.call(material, standard)
  material.color.copy(standard.color)
  material.roughness = standard.roughness
  material.metalness = standard.metalness
  material.emissive.copy(standard.emissive)
  material.emissiveIntensity = standard.emissiveIntensity
  material.map = standard.map
  material.flatShading = standard.flatShading

  return material
}
