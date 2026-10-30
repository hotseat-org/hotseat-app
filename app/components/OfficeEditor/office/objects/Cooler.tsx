import { PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { Surface } from "../../objects/Surface"

interface Props {
  color?: string
}

const WATER = "#6db3e0"

/** A water cooler: cabinet body, blue bottle on top, a spout. */
export const Cooler = ({ color = "#e8edf2" }: Props) => (
  <group>
    {/* Body */}
    <RoundedBox
      args={[0.36, 0.9, 0.36]}
      radius={0.04}
      smoothness={4}
      position={[0, 0.45, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.5} metalness={0.1} />
    </RoundedBox>
    {/* Bottle neck */}
    <mesh position={[0, 0.94, 0]} castShadow>
      <cylinderGeometry args={[0.07, 0.11, 0.1, 12]} />
      <Surface color={WATER} roughness={0.2} metalness={0.1} />
    </mesh>
    {/* Bottle */}
    <mesh position={[0, 1.13, 0]} castShadow>
      <cylinderGeometry args={[0.16, 0.15, 0.32, 16]} />
      <Surface color={WATER} roughness={0.2} metalness={0.1} />
    </mesh>
    {/* Spout panel */}
    <mesh position={[0, 0.55, 0.18]}>
      <boxGeometry args={[0.14, 0.12, 0.04]} />
      <Surface color={PALETTE.seatLeg} roughness={0.5} />
    </mesh>
  </group>
)
