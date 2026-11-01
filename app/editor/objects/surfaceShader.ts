import type { WebGLProgramParametersWithUniforms } from "three"
import { CUTAWAY_PATCHES, type CutawayKind } from "../walls/cutaway"
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

const glsl = (value: number) => value.toFixed(4)

const patchShading = (
  shader: WebGLProgramParametersWithUniforms,
  place: FloorPlace,
  isInWall: boolean
) => {
  shader.uniforms.shownFloor = shownFloorUniform
  shader.uniforms.groundLevel = groundUniform
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying vec3 vShadeWorld;\nvarying vec3 vShadeNormal;"
    )
    .replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vShadeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vShadeNormal = normalize(mat3(modelMatrix) * objectNormal);`
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\nuniform float shownFloor;\nuniform float groundLevel;\nvarying vec3 vShadeWorld;\nvarying vec3 vShadeNormal;"
    )
    .replace(
      "#include <color_fragment>",
      /* glsl */ `#include <color_fragment>
      {
        vec3 n = normalize(vShadeNormal);
        float upright = 1.0 - abs(n.y);
        float aboveFloor = vShadeWorld.y - shownFloor - (${glsl(place.base)});
        float height = ${isInWall ? "vShadeWorld.y - groundLevel" : "aboveFloor"};
        float contact = mix(${glsl(CONTACT_DARKEST)}, 1.0, smoothstep(0.0, ${glsl(CONTACT_REACH)}, height));
        float gradient = mix(${glsl(GRADIENT_LOW)}, ${glsl(GRADIENT_HIGH)}, smoothstep(0.0, ${glsl(GRADIENT_REACH)}, height));
        float shade = mix(1.0, contact * gradient, upright);
        if (n.y < -0.5) shade *= ${glsl(UNDERSIDE)};
        diffuseColor.rgb *= shade;
      }`
    )
}

const cache = new Map<
  string,
  {
    onBeforeCompile: (shader: WebGLProgramParametersWithUniforms) => void
    customProgramCacheKey: () => string
  }
>()

const SHOWN_FLOOR: FloorPlace = { base: 0 }

/**
 * Material props for a Surface's shader: the shading above, plus the wall
 * cutaway when it's sliced by one (and so is in a wall) — on its floor
 * (`place`). One program per variant, shared.
 */
export const getSurfaceShader = (cutaway: CutawayKind | null, place = SHOWN_FLOOR) => {
  const placeKey = place.base ? `@${glsl(place.base)}` : ""
  const id = `${cutaway ?? "plain"}${placeKey}`
  let props = cache.get(id)
  if (!props) {
    const cutawayPatch = cutaway ? CUTAWAY_PATCHES[cutaway] : null
    const key = `surface${cutawayPatch ? `-${cutawayPatch.key}` : ""}${placeKey}`
    props = {
      onBeforeCompile: (shader) => {
        patchShading(shader, place, cutaway !== null)
        cutawayPatch?.patch(shader)
      },
      customProgramCacheKey: () => key,
    }
    cache.set(id, props)
  }

  return props
}
