import { RoundedBox } from "@react-three/drei"
import type { ReactNode } from "react"
import { ACCENT, PALETTE } from "../palette"
import { Steam } from "./Steam"
import { Surface } from "./Surface"

/**
 * Small tabletop props that make furniture look lived-in: mugs, plates of
 * food, books, laptops… Each stands on y = 0 (the surface it's put on) and is
 * kept low-poly — furniture baking merges them into their piece's batches, so
 * they cost vertices, not draw calls.
 */

type V3 = [number, number, number]

interface At {
  position?: V3
  /** Y rotation (radians). */
  turn?: number
}

const Place = ({ position, turn = 0, children }: At & { children: ReactNode }) => (
  <group position={position} rotation={[0, turn, 0]}>
    {children}
  </group>
)

const CERAMIC = "#f3f1ec"
const CHROME = "#b9bcc4"

/** A mug; `hot` adds steam. */
export const Mug = ({ color = CERAMIC, hot, ...at }: At & { color?: string; hot?: boolean }) => (
  <Place {...at}>
    <mesh position={[0, 0.045, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.03, 0.09, 14]} />
      <Surface color={color} roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.086, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.004, 14]} />
      <Surface color="#5a3a26" roughness={0.3} />
    </mesh>
    <mesh position={[0.038, 0.048, 0]}>
      <torusGeometry args={[0.022, 0.007, 6, 12]} />
      <Surface color={color} roughness={0.4} />
    </mesh>
    {hot && <Steam position={[0, 0.1, 0]} size={0.7} />}
  </Place>
)

/** A drinking glass, optionally with water or wine in it. */
export const Glass = ({ drink, ...at }: At & { drink?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.03, 0.026, 0.12, 12]} />
      <Surface color="#dcecf2" roughness={0.05} metalness={0.2} opacity={0.35} />
    </mesh>
    {drink && (
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.026, 0.024, 0.06, 12]} />
        <Surface color={drink} roughness={0.1} opacity={0.7} />
      </mesh>
    )}
  </Place>
)

/** A bottle (water, wine, soda). */
export const Bottle = ({ color = "#5f8a86", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.1, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.035, 0.2, 12]} />
      <Surface color={color} roughness={0.15} metalness={0.1} opacity={0.85} />
    </mesh>
    <mesh position={[0, 0.235, 0]} castShadow>
      <cylinderGeometry args={[0.012, 0.03, 0.07, 10]} />
      <Surface color={color} roughness={0.15} metalness={0.1} opacity={0.85} />
    </mesh>
    <mesh position={[0, 0.278, 0]}>
      <cylinderGeometry args={[0.013, 0.013, 0.02, 8]} />
      <Surface color={PALETTE.seatLeg} roughness={0.5} />
    </mesh>
  </Place>
)

export type Food = "pasta" | "salad" | "curry" | "steak" | "sushi"

const FOOD: Record<Food, { base: string; bits: string[] }> = {
  pasta: { base: "#e8c07a", bits: ["#c9564f", "#7fa66a"] },
  salad: { base: "#7fa66a", bits: ["#c9564f", "#e8c07a", "#6b9159"] },
  curry: { base: "#d98a3a", bits: ["#f3f1ec", "#7fa66a"] },
  steak: { base: "#7a4a33", bits: ["#e8c07a", "#7fa66a"] },
  sushi: { base: "#f3f1ec", bits: ["#e9876a", "#3d4657"] },
}

/** A plate of food; `hot` dishes steam. */
export const Plate = ({ food, hot, ...at }: At & { food?: Food; hot?: boolean }) => {
  const f = food && FOOD[food]
  return (
    <Place {...at}>
      <mesh position={[0, 0.008, 0]} receiveShadow>
        <cylinderGeometry args={[0.12, 0.09, 0.016, 20]} />
        <Surface color={CERAMIC} roughness={0.35} />
      </mesh>
      {f && (
        <>
          <mesh position={[0, 0.026, 0]} scale={[1, 0.38, 1]} castShadow>
            <sphereGeometry args={[0.07, 12, 8]} />
            <Surface color={f.base} roughness={0.7} />
          </mesh>
          {f.bits.map((c, i) => (
            <mesh
              key={i}
              position={[Math.cos(i * 2.3) * 0.045, 0.045, Math.sin(i * 2.3) * 0.045]}
              castShadow
            >
              <icosahedronGeometry args={[0.018, 0]} />
              <Surface color={c} roughness={0.7} flatShading />
            </mesh>
          ))}
        </>
      )}
      {hot && <Steam position={[0, 0.06, 0]} />}
    </Place>
  )
}

/** Knife and fork beside a plate. */
export const Cutlery = (at: At) => (
  <Place {...at}>
    {[-0.02, 0.02].map((x) => (
      <mesh key={x} position={[x, 0.004, 0]}>
        <boxGeometry args={[0.012, 0.006, 0.17]} />
        <Surface color={CHROME} roughness={0.25} metalness={0.7} />
      </mesh>
    ))}
  </Place>
)

/** A steaming pot / casserole to share. */
export const Pot = ({ color = "#c9564f", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.06, 0]} castShadow>
      <cylinderGeometry args={[0.11, 0.1, 0.12, 20]} />
      <Surface color={color} roughness={0.35} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0.118, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.004, 20]} />
      <Surface color="#d98a3a" roughness={0.6} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.125, 0.09, 0]} castShadow>
        <boxGeometry args={[0.04, 0.018, 0.05]} />
        <Surface color={color} roughness={0.35} />
      </mesh>
    ))}
    <mesh position={[0, 0.005, 0]} receiveShadow>
      <cylinderGeometry args={[0.15, 0.15, 0.01, 20]} />
      <Surface color={PALETTE.deskLeg} roughness={0.8} />
    </mesh>
    <Steam position={[0, 0.13, 0]} size={1.5} />
  </Place>
)

/** An open pizza box with a pizza in it (steaming). */
export const Pizza = (at: At) => (
  <Place {...at}>
    <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.38, 0.024, 0.38]} />
      <Surface color="#d9c4a0" roughness={0.9} />
    </mesh>
    {/* Lid, flipped open behind */}
    <mesh position={[0, 0.2, -0.2]} rotation={[-1.35, 0, 0]} castShadow>
      <boxGeometry args={[0.38, 0.38, 0.012]} />
      <Surface color="#d9c4a0" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.03, 0]} castShadow>
      <cylinderGeometry args={[0.16, 0.16, 0.014, 20]} />
      <Surface color="#e8b465" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.038, 0]}>
      <cylinderGeometry args={[0.135, 0.135, 0.006, 20]} />
      <Surface color="#c9564f" roughness={0.7} />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} position={[Math.cos(i * 1.1) * 0.08, 0.043, Math.sin(i * 1.1) * 0.08]}>
        <cylinderGeometry args={[0.022, 0.022, 0.006, 10]} />
        <Surface color={i % 2 ? "#9e3b3b" : "#f3e4b8"} roughness={0.7} />
      </mesh>
    ))}
    <Steam position={[0, 0.06, 0]} size={1.2} />
  </Place>
)

/** A bowl of fruit. */
export const FruitBowl = (at: At) => (
  <Place {...at}>
    <mesh position={[0, 0.04, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.06, 0.08, 16]} />
      <Surface color={CERAMIC} roughness={0.4} />
    </mesh>
    {(
      [
        [0, 0.1, 0, "#c9564f"],
        [0.05, 0.09, 0.03, "#e8c07a"],
        [-0.05, 0.09, 0.02, "#7fa66a"],
        [0.01, 0.09, -0.05, "#d98a3a"],
      ] as [number, number, number, string][]
    ).map(([x, y, z, c]) => (
      <mesh key={c} position={[x, y, z]} castShadow>
        <sphereGeometry args={[0.04, 10, 8]} />
        <Surface color={c} roughness={0.5} />
      </mesh>
    ))}
  </Place>
)

/** A croissant (a squashed, curled torus). */
export const Croissant = (at: At) => (
  <Place {...at}>
    <mesh position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.7]} castShadow>
      <torusGeometry args={[0.045, 0.024, 8, 12, Math.PI * 1.3]} />
      <Surface color="#d9a05b" roughness={0.7} />
    </mesh>
  </Place>
)

/** A stack of books, slightly skewed. */
export const Books = ({
  colors = ["#6d90c9", "#b96f6f", "#e8c07a"],
  ...at
}: At & { colors?: string[] }) => (
  <Place {...at}>
    {colors.map((c, i) => (
      <group
        key={i}
        position={[0, 0.018 + i * 0.036, 0]}
        rotation={[0, (i % 2 ? 1 : -1) * 0.12 * i, 0]}
      >
        <RoundedBox args={[0.2, 0.034, 0.14]} radius={0.006} smoothness={2} castShadow>
          <Surface color={c} roughness={0.8} />
        </RoundedBox>
        {/* Pages edge */}
        <mesh position={[0.004, 0, 0.066]}>
          <boxGeometry args={[0.18, 0.026, 0.01]} />
          <Surface color="#f6f1e6" roughness={0.9} />
        </mesh>
      </group>
    ))}
  </Place>
)

/** A magazine lying flat. */
export const Magazine = ({ color = "#b96f6f", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.004, 0]} castShadow>
      <boxGeometry args={[0.2, 0.008, 0.27]} />
      <Surface color={color} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.0085, 0.05]}>
      <boxGeometry args={[0.15, 0.001, 0.09]} />
      <Surface color="#f6f1e6" roughness={0.5} />
    </mesh>
  </Place>
)

/** Loose sheets of paper. */
export const Papers = (at: At) => (
  <Place {...at}>
    {[0, 0.25, -0.18].map((r, i) => (
      <mesh
        key={i}
        position={[i * 0.02, 0.002 + i * 0.002, i * 0.015]}
        rotation={[0, r, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.21, 0.002, 0.29]} />
        <Surface color="#fbfaf6" roughness={0.9} />
      </mesh>
    ))}
  </Place>
)

/** A notebook with a pen on it. */
export const Notebook = ({ color = "#3d4657", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <RoundedBox
      args={[0.15, 0.014, 0.21]}
      radius={0.005}
      smoothness={2}
      position={[0, 0.007, 0]}
      castShadow
    >
      <Surface color={color} roughness={0.7} />
    </RoundedBox>
    <mesh position={[0.03, 0.02, 0]} rotation={[Math.PI / 2, 0, 0.5]} castShadow>
      <cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
      <Surface color={ACCENT} roughness={0.4} />
    </mesh>
  </Place>
)

/** An open laptop, screen lit. */
export const Laptop = ({ color = "#9aa3ad", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <RoundedBox
      args={[0.32, 0.016, 0.22]}
      radius={0.006}
      smoothness={2}
      position={[0, 0.008, 0]}
      castShadow
    >
      <Surface color={color} roughness={0.35} metalness={0.5} />
    </RoundedBox>
    <mesh position={[0, 0.017, 0.02]}>
      <boxGeometry args={[0.27, 0.002, 0.1]} />
      <Surface color="#3d4657" roughness={0.7} />
    </mesh>
    <group position={[0, 0.016, -0.105]} rotation={[-0.3, 0, 0]}>
      <RoundedBox
        args={[0.32, 0.21, 0.01]}
        radius={0.006}
        smoothness={2}
        position={[0, 0.105, 0]}
        castShadow
      >
        <Surface color={color} roughness={0.35} metalness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.108, 0.0055]}>
        <planeGeometry args={[0.29, 0.18]} />
        <Surface color="#cfeefb" emissive={ACCENT} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </group>
  </Place>
)

/** A little potted succulent. */
export const Succulent = ({ pot = PALETTE.pot, ...at }: At & { pot?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.04, 0]} castShadow>
      <cylinderGeometry args={[0.045, 0.035, 0.08, 12]} />
      <Surface color={pot} roughness={0.7} />
    </mesh>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh
        key={i}
        position={[Math.cos(i * 1.26) * 0.022, 0.1, Math.sin(i * 1.26) * 0.022]}
        rotation={[Math.sin(i * 1.26) * 0.5, 0, -Math.cos(i * 1.26) * 0.5]}
        castShadow
      >
        <coneGeometry args={[0.018, 0.06, 5]} />
        <Surface
          color={i % 2 ? PALETTE.plantLeaf : PALETTE.plantLeafDark}
          roughness={0.8}
          flatShading
        />
      </mesh>
    ))}
  </Place>
)

/** A vase of flowers. */
export const Flowers = ({ vase = "#6d90c9", ...at }: At & { vase?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.07, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.05, 0.14, 12]} />
      <Surface color={vase} roughness={0.3} />
    </mesh>
    {(
      [
        [0.02, 0.24, 0, "#e9876a"],
        [-0.03, 0.22, 0.02, "#e8c07a"],
        [0, 0.26, -0.03, "#f3f1ec"],
        [0.03, 0.2, 0.03, "#b96f6f"],
      ] as [number, number, number, string][]
    ).map(([x, y, z, c]) => (
      <group key={c}>
        <mesh position={[x / 2, (0.12 + y) / 2, z / 2]} rotation={[z * 3, 0, -x * 3]}>
          <cylinderGeometry args={[0.004, 0.004, y - 0.12, 5]} />
          <Surface color={PALETTE.plantLeafDark} roughness={0.8} />
        </mesh>
        <mesh position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[0.028, 0]} />
          <Surface color={c} roughness={0.7} flatShading />
        </mesh>
      </group>
    ))}
  </Place>
)

/** A TV remote. */
export const Remote = (at: At) => (
  <Place {...at}>
    <RoundedBox
      args={[0.045, 0.018, 0.16]}
      radius={0.008}
      smoothness={2}
      position={[0, 0.009, 0]}
      castShadow
    >
      <Surface color={PALETTE.seatLeg} roughness={0.6} />
    </RoundedBox>
    <mesh position={[0, 0.019, -0.05]}>
      <cylinderGeometry args={[0.008, 0.008, 0.003, 8]} />
      <Surface color="#c9564f" roughness={0.5} />
    </mesh>
  </Place>
)

/** A pen cup with pens. */
export const PenCup = ({ color = "#5f8a86", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <mesh position={[0, 0.045, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.03, 0.09, 12]} />
      <Surface color={color} roughness={0.6} />
    </mesh>
    {(
      [
        [0.01, 0.2, "#3d4657"],
        [-0.012, -0.15, ACCENT],
        [0, 0.05, "#c9564f"],
      ] as [number, number, string][]
    ).map(([x, r, c]) => (
      <mesh key={c} position={[x, 0.11, 0]} rotation={[0, 0, r]}>
        <cylinderGeometry args={[0.004, 0.004, 0.13, 6]} />
        <Surface color={c} roughness={0.5} />
      </mesh>
    ))}
  </Place>
)

/** A plump throw cushion, leaning back at `lean` radians. */
export const Cushion = ({
  color = "#e8c07a",
  lean = 0.35,
  ...at
}: At & { color?: string; lean?: number }) => (
  <Place {...at}>
    <RoundedBox
      args={[0.34, 0.3, 0.1]}
      radius={0.05}
      smoothness={3}
      position={[0, 0.14, 0]}
      rotation={[-lean, 0, 0]}
      castShadow
    >
      <Surface color={color} roughness={0.95} />
    </RoundedBox>
  </Place>
)

/** A folded throw blanket draped over an armrest or seat. */
export const Throw = ({ color = "#b96f6f", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <RoundedBox
      args={[0.34, 0.04, 0.5]}
      radius={0.018}
      smoothness={2}
      position={[0, 0.02, 0]}
      castShadow
    >
      <Surface color={color} roughness={1} />
    </RoundedBox>
    {[-0.12, 0, 0.12].map((z) => (
      <mesh key={z} position={[0, 0.041, z]}>
        <boxGeometry args={[0.34, 0.002, 0.03]} />
        <Surface color="#f3e4d0" roughness={1} />
      </mesh>
    ))}
  </Place>
)

/** A sticky note (flat, for monitors and boards). */
export const StickyNote = ({ color = "#f7df7a", ...at }: At & { color?: string }) => (
  <Place {...at}>
    <mesh>
      <boxGeometry args={[0.07, 0.07, 0.002]} />
      <Surface color={color} roughness={0.8} />
    </mesh>
  </Place>
)
