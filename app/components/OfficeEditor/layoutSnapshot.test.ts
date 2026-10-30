/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import {
  composeWallColors,
  enclosedRegions,
  furnitureCollides,
  mountWalls,
  wallJointNodes,
} from "./layout"
import { getStructureBounds } from "./structureField"
import { TEMPLATES } from "./templates"
import { isEdgeType, isMarker, isSeatable, isWallMounted, type SceneObject } from "./types"
import { getRoute } from "./wayfinding"
import { composeZoneAreas } from "./zones"

/**
 * A safety net for refactoring the layout logic: what it makes of every
 * template — rooms, wall colours and joints, collisions, wall mounts, zones,
 * the way to each desk — recorded once and compared on every run. A change
 * here means the editor now reads some office differently: check that's
 * intended, then update the snapshot (`bun test --update-snapshots`).
 */

/** A template with ids that stay the same from run to run, and some paint and zones. */
const buildStable = (build: () => SceneObject[]) =>
  build().map((o, i) => ({
    ...o,
    id: `${o.type}-${i}`,
    ...(o.type === "wall" && i % 5 === 0 && { colorFront: "#aa3344", colorBack: "#3344aa" }),
    ...(isSeatable(o.type) && i % 3 === 0 && { zone: i % 2 ? "Eng" : "Ops" }),
  }))

const round = (n: number) => Math.round(n * 1000) / 1000

/** A short fingerprint of a long list: any change to it changes this. */
const checksum = (values: unknown[]) => {
  let hash = 0
  for (const char of JSON.stringify(values)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash.toString(36)
}

describe("every template reads the same", () => {
  for (const template of TEMPLATES)
    test(template.id, () => {
      const objects = buildStable(template.build)
      const furniture = objects.filter((o) => !isEdgeType(o.type) && !isMarker(o.type))
      const colors = composeWallColors(objects)
      expect({
        rooms: enclosedRegions(objects).map((r) => [r.length, checksum(r)]),
        openings: [...colors.openings],
        joints: [...colors.joints],
        jointNodes: wallJointNodes(objects),
        collides: furniture
          .filter((o) => furnitureCollides(objects, o.type, o.x, o.z, o.rotation, o.id))
          .map((o) => o.id),
        mounts: furniture
          .filter((o) => isWallMounted(o.type))
          .map((o) => [o.id, mountWalls(objects, o.type, o.x, o.z, o.rotation)]),
        zones: composeZoneAreas(objects).map((a) => [a.zone.name, a.cells.length, a.label]),
        bounds: getStructureBounds(objects),
        routes: furniture
          .filter((o) => isSeatable(o.type))
          .map((o) => {
            const route = getRoute(objects, o.id)
            return [o.id, route ? round(route.length) : null]
          }),
      }).toMatchSnapshot()
    })
})
