import type { ReactNode } from "react"
import { PALETTE } from "../palette"

/**
 * Catalog category icons: small flat illustrations in the editor's furniture
 * palette (40×40) — each category's most recognisable piece, in its colours,
 * with a lighter top / darker side for depth and a soft ground shadow. No
 * outlines, so they read on the light and the dark rail alike.
 */
const Illustration = ({ className, children }: { className?: string; children: ReactNode }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden>
    <ellipse cx="20" cy="36" rx="14" ry="2.2" fill="#000" opacity="0.13" />
    {children}
  </svg>
)

type IconProps = { className?: string }

const Structure = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* Wall with a coping and brick courses */}
    <rect x="3" y="8" width="34" height="27" rx="2" fill="#d8c6a8" />
    <rect x="2" y="6" width="36" height="4" rx="1.5" fill={PALETTE.wall} />
    <g fill="#cbb693">
      <rect x="5" y="13" width="6" height="2.4" rx="0.6" />
      <rect x="5" y="19" width="4" height="2.4" rx="0.6" />
      <rect x="5" y="25" width="6" height="2.4" rx="0.6" />
      <rect x="30" y="13" width="5" height="2.4" rx="0.6" />
      <rect x="31" y="19" width="4" height="2.4" rx="0.6" />
      <rect x="29" y="25" width="6" height="2.4" rx="0.6" />
    </g>
    {/* Door in its frame */}
    <rect x="12" y="11" width="16" height="24" rx="2" fill={PALETTE.doorFrame} />
    <rect x="14" y="13" width="12" height="22" rx="1.2" fill={PALETTE.doorLeaf} />
    <rect x="16" y="15.5" width="8" height="7" rx="1" fill={PALETTE.pot} />
    <rect x="16" y="24.5" width="8" height="7.5" rx="1" fill={PALETTE.pot} />
    <circle cx="24" cy="24" r="1.2" fill={PALETTE.doorHandle} />
  </Illustration>
)

const Desks = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* Monitor */}
    <rect x="17" y="5" width="18" height="12.5" rx="1.8" fill="#3d4657" />
    <rect x="18.5" y="6.5" width="15" height="9.5" rx="0.9" fill={PALETTE.seat} />
    <path d="M18.5 16 L26 6.5 H33.5 V9 L25.5 16 Z" fill="#8fb0e0" opacity="0.6" />
    <rect x="25" y="17.5" width="2" height="2.5" fill="#3d4657" />
    <rect x="22.5" y="19" width="7" height="1.4" rx="0.7" fill="#3d4657" />
    {/* Mug */}
    <rect x="7" y="15.5" width="3.6" height="4.5" rx="1" fill={PALETTE.door} />
    {/* Top, drawer unit, leg */}
    <rect x="3" y="20" width="34" height="4" rx="1.5" fill={PALETTE.deskTop} />
    <rect x="3" y="22.5" width="34" height="1.5" fill="#b5825a" />
    <rect x="5" y="24" width="11" height="11" rx="1" fill={PALETTE.deskLeg} />
    <rect x="6.5" y="25.5" width="8" height="3.8" rx="0.7" fill="#a07b58" />
    <rect x="6.5" y="30.2" width="8" height="3.8" rx="0.7" fill="#a07b58" />
    <rect x="9.5" y="27" width="2" height="0.9" rx="0.45" fill={PALETTE.doorHandle} />
    <rect x="9.5" y="31.7" width="2" height="0.9" rx="0.45" fill={PALETTE.doorHandle} />
    <rect x="32" y="24" width="3" height="11" rx="0.8" fill={PALETTE.deskLeg} />
  </Illustration>
)

const Seating = ({ className }: IconProps) => (
  <Illustration className={className}>
    <rect x="8.5" y="6" width="23" height="19" rx="6" fill="#b5785c" />
    <rect x="11" y="8.5" width="18" height="13" rx="4.5" fill="#cf957a" />
    <rect x="9" y="20" width="22" height="8" rx="3" fill="#d9a488" />
    <rect x="3.5" y="15" width="8" height="16" rx="4" fill="#c0876a" />
    <rect x="28.5" y="15" width="8" height="16" rx="4" fill="#c0876a" />
    <rect x="3.5" y="15" width="8" height="5" rx="2.5" fill="#cf957a" />
    <rect x="28.5" y="15" width="8" height="5" rx="2.5" fill="#cf957a" />
    <rect x="8" y="27" width="24" height="5" rx="2" fill="#a86e52" />
    <rect x="9" y="31.5" width="2.4" height="3.5" rx="0.8" fill="#5b4636" />
    <rect x="28.6" y="31.5" width="2.4" height="3.5" rx="0.8" fill="#5b4636" />
  </Illustration>
)

const Tables = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* Vase with flowers, a stack of books, a cup */}
    <rect x="9" y="13" width="4.4" height="8" rx="2" fill={PALETTE.seat} />
    <rect x="10.6" y="8" width="1.2" height="5.5" fill={PALETTE.plantLeafDark} />
    <circle cx="9.6" cy="8.6" r="2.1" fill="#e2b04a" />
    <circle cx="13.2" cy="9.4" r="2" fill={PALETTE.door} />
    <rect x="18" y="18" width="10" height="2.2" rx="0.6" fill="#d65a4a" />
    <rect x="19" y="15.9" width="8.5" height="2.2" rx="0.6" fill={PALETTE.plantLeaf} />
    <rect x="30" y="16" width="4" height="4.2" rx="1" fill={PALETTE.wall} />
    {/* Top, shelf, legs */}
    <rect x="3" y="20" width="34" height="4.4" rx="1.6" fill={PALETTE.deskTop} />
    <rect x="3" y="22.8" width="34" height="1.6" fill="#b5825a" />
    <rect x="6" y="24" width="3" height="11" rx="0.8" fill={PALETTE.deskLeg} />
    <rect x="31" y="24" width="3" height="11" rx="0.8" fill={PALETTE.deskLeg} />
    <rect x="8" y="29.5" width="24" height="2.2" rx="0.6" fill="#a07b58" />
  </Illustration>
)

const BOOKS: [number, number, string][] = [
  // [x, height, colour] per shelf row
  [10, 6.5, "#d65a4a"],
  [12.6, 5.5, PALETTE.seat],
  [15, 6.8, "#e2b04a"],
  [17.6, 5.2, PALETTE.plantLeaf],
  [22.5, 6.2, PALETTE.door],
  [25, 5.6, "#9a7bb5"],
]

const Storage = ({ className }: IconProps) => (
  <Illustration className={className}>
    <rect x="7" y="3" width="26" height="33" rx="1.8" fill={PALETTE.deskLeg} />
    <rect x="9" y="5" width="22" height="29" rx="0.8" fill="#6f5038" />
    {[14, 24].map((y) => (
      <rect key={y} x="8" y={y} width="24" height="1.8" fill={PALETTE.deskLeg} />
    ))}
    {[14, 24].map((shelf, row) =>
      BOOKS.map(([x, h, c], i) => (
        <rect
          key={`${row}-${i}`}
          x={row ? x + 1.2 : x}
          y={shelf - (row ? h - 0.6 : h)}
          width="2.2"
          height={row ? h - 0.6 : h}
          rx="0.5"
          fill={c}
        />
      ))
    )}
    {/* Bottom shelf: a little plant and a box */}
    <rect x="11" y="29.5" width="5" height="4.5" rx="1" fill={PALETTE.pot} />
    <circle cx="12.4" cy="28.2" r="2.2" fill={PALETTE.plantLeaf} />
    <circle cx="14.8" cy="27.6" r="2" fill={PALETTE.plantLeafDark} />
    <rect x="21" y="28.5" width="8" height="5.5" rx="0.8" fill="#e2c9a0" />
  </Illustration>
)

const Equipment = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* TV on a low cabinet */}
    <rect x="3" y="4" width="34" height="21" rx="2.2" fill="#4a5163" />
    <rect x="5" y="6" width="30" height="17" rx="1.2" fill={PALETTE.seat} />
    <path d="M5 23 L13 13 L19 18 L24 12 L35 21 V23 Z" fill={PALETTE.plantLeaf} />
    <circle cx="29" cy="10.5" r="2.6" fill="#e2b04a" />
    <path d="M5 6 H19 L9 23 H5 Z" fill="#fff" opacity="0.12" />
    <rect x="18" y="25" width="4" height="3" fill="#3d4657" />
    <rect x="6" y="28" width="28" height="7" rx="1.5" fill={PALETTE.deskLeg} />
    <rect x="8" y="30" width="11" height="3" rx="0.6" fill="#a07b58" />
    <rect x="21" y="30" width="11" height="3" rx="0.6" fill="#a07b58" />
  </Illustration>
)

const SNACKS = ["#e2b04a", PALETTE.plantLeaf, "#d65a4a", PALETTE.seat]

const Kitchen = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* A vending machine: the kitchen's most colourful piece */}
    <rect x="8" y="2" width="24" height="34" rx="2.4" fill="#c9564f" />
    <rect x="8" y="2" width="24" height="3" rx="1.5" fill="#d9706a" />
    <rect x="10.5" y="6.5" width="13.5" height="22" rx="1.2" fill="#2c313c" />
    {[0, 1, 2, 3].map((row) =>
      [0, 1, 2].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={12 + col * 4}
          y={8.5 + row * 5}
          width="2.8"
          height="3.4"
          rx="0.7"
          fill={SNACKS[(row + col) % SNACKS.length]}
        />
      ))
    )}
    <path d="M10.5 6.5 H17 L10.5 18 Z" fill="#fff" opacity="0.1" />
    <rect x="25.5" y="6.5" width="4.5" height="9" rx="1" fill={PALETTE.wall} />
    <circle cx="27.75" cy="9" r="0.9" fill="#3d4657" />
    <circle cx="27.75" cy="12.5" r="0.9" fill="#3d4657" />
    <rect x="26" y="18" width="3.5" height="1.4" rx="0.7" fill="#8f3a35" />
    <rect x="10.5" y="30.5" width="13.5" height="3" rx="1" fill="#8f3a35" />
  </Illustration>
)

const OnTheWall = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* A framed landscape */}
    <path d="M14 7 L20 2.5 L26 7" fill="none" stroke="#8f6a4a" strokeWidth="1" />
    <rect x="3" y="6" width="34" height="27" rx="1.8" fill={PALETTE.deskTop} />
    <rect x="5.5" y="8.5" width="29" height="22" rx="0.6" fill={PALETTE.wall} />
    <rect x="8" y="11" width="24" height="17" fill="#9fc3c9" />
    <circle cx="26" cy="15.5" r="3" fill="#e2b04a" />
    <path d="M8 28 V22 L15 15 L21 21 L25 18 L32 24 V28 Z" fill={PALETTE.plantLeafDark} />
    <path d="M8 28 V25 L14 21 L22 26 L27 23 L32 26 V28 Z" fill={PALETTE.plantLeaf} />
  </Illustration>
)

const Bathroom = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* Bathtub with bubbles */}
    <path d="M6 19 V9 a3.5 3.5 0 0 1 7 0" fill="none" stroke="#b9bcc4" strokeWidth="2" />
    <rect x="11" y="9" width="4" height="1.8" rx="0.9" fill="#b9bcc4" />
    <circle cx="20" cy="14" r="2.6" fill="#fff" opacity="0.9" />
    <circle cx="24.5" cy="11.5" r="1.8" fill="#fff" opacity="0.9" />
    <circle cx="27.5" cy="15.5" r="2.2" fill="#fff" opacity="0.9" />
    <circle cx="16" cy="16.5" r="1.6" fill="#fff" opacity="0.9" />
    <rect x="2.5" y="17.5" width="35" height="3.5" rx="1.75" fill="#e8edf2" />
    <path d="M4 21 H36 V25 a7 7 0 0 1 -7 7 H11 a7 7 0 0 1 -7 -7 Z" fill="#5f8a86" />
    <path d="M4 21 H36 V23 H4 Z" fill="#4f7672" />
    <rect x="9" y="31" width="3" height="4" rx="1" fill="#b9bcc4" />
    <rect x="28" y="31" width="3" height="4" rx="1" fill="#b9bcc4" />
  </Illustration>
)

const Decor = ({ className }: IconProps) => (
  <Illustration className={className}>
    {/* Potted plant */}
    <ellipse
      cx="13"
      cy="13"
      rx="4"
      ry="8"
      transform="rotate(-35 13 13)"
      fill={PALETTE.plantLeafDark}
    />
    <ellipse
      cx="27"
      cy="13"
      rx="4"
      ry="8"
      transform="rotate(35 27 13)"
      fill={PALETTE.plantLeafDark}
    />
    <ellipse cx="20" cy="10" rx="4.2" ry="8.5" fill={PALETTE.plantLeaf} />
    <ellipse cx="14.5" cy="18" rx="3.6" ry="6.5" transform="rotate(-60 14.5 18)" fill="#93b97c" />
    <ellipse cx="25.5" cy="18" rx="3.6" ry="6.5" transform="rotate(60 25.5 18)" fill="#93b97c" />
    <path d="M11 23 H29 L27 35 H13 Z" fill={PALETTE.pot} />
    <rect x="9.5" y="21.5" width="21" height="4" rx="1.5" fill={PALETTE.door} />
  </Illustration>
)

export type CategoryIcon = (props: IconProps) => ReactNode

export {
  Bathroom as BathroomIcon,
  Decor as DecorIcon,
  Desks as DesksIcon,
  Equipment as EquipmentIcon,
  Kitchen as KitchenIcon,
  OnTheWall as OnTheWallIcon,
  Seating as SeatingIcon,
  Storage as StorageIcon,
  Structure as StructureIcon,
  Tables as TablesIcon,
}
