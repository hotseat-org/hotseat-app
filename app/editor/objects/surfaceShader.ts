import type { WebGLProgramParametersWithUniforms } from "three"
import { CUTAWAY_PATCHES, type CutawayKind } from "../walls/cutaway"
import { shownFloorUniform } from "./floorHeight"

/**
 * Shading every solid surface gets in its shader, computed per pixel from its
 * height and facing (no textures, no extra passes):
 * - contact: sides darken towards the floor and undersides are shaded, so
 *   furniture sits on the floor instead of floating (what ambient occlusion
 *   does, for free and always on);
 * - a soft vertical gradient on upright faces, darker low, lighter high, so
 *   walls and tall pieces read as solid.
 * Both by height above the surface's own floor (`floorBase` from the shown
 * floor's, which glides — see floorHeight.ts).
 */
const CONTACT_REACH = 0.3 // m above the floor the darkening fades out
const CONTACT_DARKEST = 0.72
const UNDERSIDE = 0.78
const GRADIENT_LOW = 0.94
const GRADIENT_HIGH = 1.03
const GRADIENT_REACH = 1.6

const glsl = (value: number) => value.toFixed(4)

const patchShading = (shader: WebGLProgramParametersWithUniforms, floorBase: number) => {
  shader.uniforms.shownFloor = shownFloorUniform
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
      "#include <common>\nuniform float shownFloor;\nvarying vec3 vShadeWorld;\nvarying vec3 vShadeNormal;"
    )
    .replace(
      "#include <color_fragment>",
      /* glsl */ `#include <color_fragment>
      {
        vec3 n = normalize(vShadeNormal);
        float upright = 1.0 - abs(n.y);
        float height = vShadeWorld.y - shownFloor - (${glsl(floorBase)});
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

/**
 * Material props for a Surface's shader: the shading above, plus the wall
 * cutaway when it's sliced by one — on the shown floor (`floorBase` 0) or one
 * below. One program per variant, shared.
 */
export const getSurfaceShader = (cutaway: CutawayKind | null, floorBase = 0) => {
  const id = `${cutaway ?? "plain"}@${glsl(floorBase)}`
  let props = cache.get(id)
  if (!props) {
    const cutawayPatch = cutaway ? CUTAWAY_PATCHES[cutaway] : null
    const key = `surface${cutawayPatch ? `-${cutawayPatch.key}` : ""}${floorBase ? `@${glsl(floorBase)}` : ""}`
    props = {
      onBeforeCompile: (shader) => {
        patchShading(shader, floorBase)
        cutawayPatch?.patch(shader)
      },
      customProgramCacheKey: () => key,
    }
    cache.set(id, props)
  }

  return props
}
