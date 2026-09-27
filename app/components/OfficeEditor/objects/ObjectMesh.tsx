import type { ObjectType } from "../types"
import { Wall } from "./Wall"
import { Door } from "./Door"
import { Window } from "./Window"
import { Desk } from "./Desk"
import { Seat } from "./Seat"
import { Plant } from "./Plant"
import { Workstation } from "./Workstation"
import { Deskmate } from "./Deskmate"
import { Sofa } from "./Sofa"
import { CoffeeTable } from "./CoffeeTable"
import { MeetingTable } from "./MeetingTable"
import { Bookshelf } from "./Bookshelf"
import { Rug } from "./Rug"
import { Cooler } from "./Cooler"
import { FilingCabinet } from "./FilingCabinet"
import { Lockers } from "./Lockers"
import { Printer } from "./Printer"
import { TvScreen } from "./TvScreen"
import { Whiteboard } from "./Whiteboard"
import { VendingMachine } from "./VendingMachine"
import { FloorLamp } from "./FloorLamp"
import { TrashBin } from "./TrashBin"
import { KitchenCounter } from "./KitchenCounter"
import { Fridge } from "./Fridge"
import { Armchair } from "./Armchair"
import { CeilingLight } from "./CeilingLight"
import { GlassWall } from "./GlassWall"
import { GlassDoor } from "./GlassDoor"
import { Wardrobe } from "./Wardrobe"
import { BarStool } from "./BarStool"
import { BarTable } from "./BarTable"
import { Toilet } from "./Toilet"
import { Shower } from "./Shower"
import { BathroomSink } from "./BathroomSink"
import { RoundTable } from "./RoundTable"
import { SquareTable } from "./SquareTable"
import { OvalTable } from "./OvalTable"
import { OvalBarTable } from "./OvalBarTable"
import { ServerRack } from "./ServerRack"
import { ShelvingUnit } from "./ShelvingUnit"
import { WallTv } from "./WallTv"
import { WallArt } from "./WallArt"
import { WallClock } from "./WallClock"
import { WallShelf } from "./WallShelf"
import { CoatRack } from "./CoatRack"
import { PlanterBox } from "./PlanterBox"
import { Divider } from "./Divider"

interface MeshProps {
  color?: string
  model?: string
  /** Which look to show (see `variantOf`); undefined = the first. */
  variant?: number
  /**
   * Desks: whether someone sits here on the shown day (view mode) — lived-in
   * and monitor on, or clean and off. Undefined (editing) = lived-in.
   */
  occupied?: boolean
}

const COMPONENTS: Record<ObjectType, (props: MeshProps) => React.ReactElement> = {
  wall: Wall,
  door: Door,
  window: Window,
  glassWall: GlassWall,
  glassDoor: GlassDoor,
  desk: Desk,
  seat: Seat,
  plant: Plant,
  workstation: Workstation,
  deskmate: Deskmate,
  sofa: Sofa,
  coffeeTable: CoffeeTable,
  meetingTable: MeetingTable,
  bookshelf: Bookshelf,
  rug: Rug,
  cooler: Cooler,
  filingCabinet: FilingCabinet,
  lockers: Lockers,
  printer: Printer,
  tvScreen: TvScreen,
  whiteboard: Whiteboard,
  vendingMachine: VendingMachine,
  floorLamp: FloorLamp,
  trashBin: TrashBin,
  kitchenCounter: KitchenCounter,
  fridge: Fridge,
  armchair: Armchair,
  ceilingLight: CeilingLight,
  wardrobe: Wardrobe,
  barStool: BarStool,
  barTable: BarTable,
  toilet: Toilet,
  shower: Shower,
  bathroomSink: BathroomSink,
  roundTable: RoundTable,
  squareTable: SquareTable,
  ovalTable: OvalTable,
  ovalBarTable: OvalBarTable,
  serverRack: ServerRack,
  shelvingUnit: ShelvingUnit,
  wallTv: WallTv,
  wallArt: WallArt,
  wallClock: WallClock,
  wallShelf: WallShelf,
  coatRack: CoatRack,
  planterBox: PlanterBox,
  divider: Divider,
  floorPaint: () => <></>, // data marker — never rendered
}

/** Radius of the on-floor footprint per type (used for the selection ring). */
export const FOOTPRINT: Record<ObjectType, number> = {
  wall: 0.72,
  door: 0.72,
  window: 0.72,
  glassWall: 0.72,
  glassDoor: 0.72,
  desk: 1.02,
  seat: 0.5,
  plant: 0.36,
  workstation: 1.3,
  deskmate: 1.4,
  sofa: 1.1,
  coffeeTable: 0.7,
  meetingTable: 2.0,
  bookshelf: 0.7,
  rug: 1.75,
  cooler: 0.32,
  filingCabinet: 0.42,
  lockers: 0.82,
  printer: 0.52,
  tvScreen: 0.82,
  whiteboard: 0.86,
  vendingMachine: 0.58,
  floorLamp: 0.3,
  trashBin: 0.26,
  kitchenCounter: 1.1,
  fridge: 0.55,
  armchair: 0.55,
  ceilingLight: 0.34,
  wardrobe: 0.85,
  barStool: 0.24,
  barTable: 0.46,
  toilet: 0.4,
  shower: 0.6,
  bathroomSink: 0.5,
  roundTable: 0.7,
  squareTable: 0.45,
  ovalTable: 1.5,
  ovalBarTable: 0.95,
  serverRack: 0.5,
  shelvingUnit: 0.75,
  wallTv: 0.8,
  wallArt: 0.55,
  wallClock: 0.3,
  wallShelf: 0.55,
  coatRack: 0.3,
  planterBox: 1.0,
  divider: 1.0,
  floorPaint: 0,
}

interface Props extends MeshProps {
  type: ObjectType
}

/** Pure, non-interactive geometry for an object type. */
export const ObjectMesh = ({ type, ...props }: Props) => {
  const Comp = COMPONENTS[type]
  return <Comp {...props} />
}
