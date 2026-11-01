import { extend, type ThreeElement } from "@react-three/fiber"
import {
  LineBasicNodeMaterial,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
} from "three/webgpu"

/**
 * Node materials as JSX (`<meshStandardNodeMaterial colorNode={…} />`): the
 * materials whose shaders are written in TSL. Imported for its side effect
 * wherever one is used.
 */
extend({ MeshStandardNodeMaterial, MeshBasicNodeMaterial, LineBasicNodeMaterial })

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshStandardNodeMaterial: ThreeElement<typeof MeshStandardNodeMaterial>
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>
    lineBasicNodeMaterial: ThreeElement<typeof LineBasicNodeMaterial>
  }
}
