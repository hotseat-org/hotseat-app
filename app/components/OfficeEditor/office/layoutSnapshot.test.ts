/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import {
  composeWallColors,
  enclosedRegions,
  furnitureCollides,
  mountWalls,
  wallJointNodes,
} from "../layout"
import { getStructureBounds } from "../structureField"
import { isEdgeType, isMarker, isSeatable, isWallMounted, type SceneObject } from "../types"
import { TEMPLATES } from "./templates"
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
  build().map((object, i) => ({
    ...object,
    id: `${object.type}-${i}`,
    ...(object.type === "wall" && i % 5 === 0 && { colorFront: "#aa3344", colorBack: "#3344aa" }),
    ...(isSeatable(object.type) && i % 3 === 0 && { zone: i % 2 ? "Eng" : "Ops" }),
  }))

const round = (value: number) => Math.round(value * 1000) / 1000

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
      const furniture = objects.filter((piece) => !isEdgeType(piece.type) && !isMarker(piece.type))
      const colors = composeWallColors(objects)
      expect({
        rooms: enclosedRegions(objects).map((region) => [region.length, checksum(region)]),
        openings: [...colors.openings],
        joints: [...colors.joints],
        jointNodes: wallJointNodes(objects),
        collides: furniture
          .filter((piece) =>
            furnitureCollides(objects, piece.type, piece.x, piece.z, piece.rotation, piece.id)
          )
          .map((piece) => piece.id),
        mounts: furniture
          .filter((piece) => isWallMounted(piece.type))
          .map((piece) => [
            piece.id,
            mountWalls(objects, piece.type, piece.x, piece.z, piece.rotation),
          ]),
        zones: composeZoneAreas(objects).map((area) => [
          area.zone.name,
          area.cells.length,
          area.label,
        ]),
        bounds: getStructureBounds(objects),
        routes: furniture
          .filter((piece) => isSeatable(piece.type))
          .map((piece) => {
            const route = getRoute(objects, piece.id)
            return [piece.id, route ? round(route.length) : null]
          }),
      }).toMatchSnapshot()
    })
})
