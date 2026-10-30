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
  /** Doors and windows: the paint of the wall they're cut into, each face. */
  wallFront?: string
  wallBack?: string
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

interface Props extends MeshProps {
  type: ObjectType
}

/** Pure, non-interactive geometry for an object type. */
export const ObjectMesh = ({ type, ...props }: Props) => {
  const Comp = COMPONENTS[type]
  return <Comp {...props} />
}
