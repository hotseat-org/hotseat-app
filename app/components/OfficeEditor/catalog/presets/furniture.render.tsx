import { Armchair } from "../../objects/Armchair"
import { BarStool } from "../../objects/BarStool"
import { BarTable } from "../../objects/BarTable"
import { BathroomSink } from "../../objects/BathroomSink"
import { Bookshelf } from "../../objects/Bookshelf"
import { CeilingLight } from "../../objects/CeilingLight"
import { CoatRack } from "../../objects/CoatRack"
import { CoffeeTable } from "../../objects/CoffeeTable"
import { Cooler } from "../../objects/Cooler"
import { Desk } from "../../objects/Desk"
import { Deskmate } from "../../objects/Deskmate"
import { Divider } from "../../objects/Divider"
import { FilingCabinet } from "../../objects/FilingCabinet"
import { FloorLamp } from "../../objects/FloorLamp"
import { Fridge } from "../../objects/Fridge"
import { KitchenCounter } from "../../objects/KitchenCounter"
import { Lockers } from "../../objects/Lockers"
import { MeetingTable } from "../../objects/MeetingTable"
import { OvalBarTable } from "../../objects/OvalBarTable"
import { OvalTable } from "../../objects/OvalTable"
import { Plant } from "../../objects/Plant"
import { PlanterBox } from "../../objects/PlanterBox"
import { Printer } from "../../objects/Printer"
import { RoundTable } from "../../objects/RoundTable"
import { Rug } from "../../objects/Rug"
import { Seat } from "../../objects/Seat"
import { ServerRack } from "../../objects/ServerRack"
import { ShelvingUnit } from "../../objects/ShelvingUnit"
import { Shower } from "../../objects/Shower"
import { Sofa } from "../../objects/Sofa"
import { SquareTable } from "../../objects/SquareTable"
import { Toilet } from "../../objects/Toilet"
import { TrashBin } from "../../objects/TrashBin"
import { TvScreen } from "../../objects/TvScreen"
import { VendingMachine } from "../../objects/VendingMachine"
import { WallArt } from "../../objects/WallArt"
import { WallClock } from "../../objects/WallClock"
import { WallShelf } from "../../objects/WallShelf"
import { WallTv } from "../../objects/WallTv"
import { Wardrobe } from "../../objects/Wardrobe"
import { Whiteboard } from "../../objects/Whiteboard"
import { Workstation } from "../../objects/Workstation"
import { registerRenderers } from "../renderers"
import { FURNITURE_SYMBOLS } from "./furnitureSymbols"

registerRenderers({
  desk: { Mesh: Desk, drawSymbol: FURNITURE_SYMBOLS.desk },
  seat: { Mesh: Seat, drawSymbol: FURNITURE_SYMBOLS.seat },
  plant: { Mesh: Plant, drawSymbol: FURNITURE_SYMBOLS.plant },
  workstation: { Mesh: Workstation, drawSymbol: FURNITURE_SYMBOLS.workstation },
  deskmate: { Mesh: Deskmate, drawSymbol: FURNITURE_SYMBOLS.deskmate },
  sofa: { Mesh: Sofa, drawSymbol: FURNITURE_SYMBOLS.sofa },
  coffeeTable: { Mesh: CoffeeTable, drawSymbol: FURNITURE_SYMBOLS.coffeeTable },
  meetingTable: { Mesh: MeetingTable, drawSymbol: FURNITURE_SYMBOLS.meetingTable },
  bookshelf: { Mesh: Bookshelf, drawSymbol: FURNITURE_SYMBOLS.bookshelf },
  rug: { Mesh: Rug, drawSymbol: FURNITURE_SYMBOLS.rug },
  cooler: { Mesh: Cooler, drawSymbol: FURNITURE_SYMBOLS.cooler },
  filingCabinet: { Mesh: FilingCabinet, drawSymbol: FURNITURE_SYMBOLS.filingCabinet },
  lockers: { Mesh: Lockers, drawSymbol: FURNITURE_SYMBOLS.lockers },
  printer: { Mesh: Printer, drawSymbol: FURNITURE_SYMBOLS.printer },
  tvScreen: { Mesh: TvScreen, drawSymbol: FURNITURE_SYMBOLS.tvScreen },
  whiteboard: { Mesh: Whiteboard, drawSymbol: FURNITURE_SYMBOLS.whiteboard },
  vendingMachine: { Mesh: VendingMachine, drawSymbol: FURNITURE_SYMBOLS.vendingMachine },
  floorLamp: { Mesh: FloorLamp, drawSymbol: FURNITURE_SYMBOLS.floorLamp },
  trashBin: { Mesh: TrashBin, drawSymbol: FURNITURE_SYMBOLS.trashBin },
  kitchenCounter: { Mesh: KitchenCounter, drawSymbol: FURNITURE_SYMBOLS.kitchenCounter },
  fridge: { Mesh: Fridge, drawSymbol: FURNITURE_SYMBOLS.fridge },
  armchair: { Mesh: Armchair, drawSymbol: FURNITURE_SYMBOLS.armchair },
  ceilingLight: { Mesh: CeilingLight, drawSymbol: FURNITURE_SYMBOLS.ceilingLight },
  wardrobe: { Mesh: Wardrobe, drawSymbol: FURNITURE_SYMBOLS.wardrobe },
  barStool: { Mesh: BarStool, drawSymbol: FURNITURE_SYMBOLS.barStool },
  barTable: { Mesh: BarTable, drawSymbol: FURNITURE_SYMBOLS.barTable },
  toilet: { Mesh: Toilet, drawSymbol: FURNITURE_SYMBOLS.toilet },
  shower: { Mesh: Shower, drawSymbol: FURNITURE_SYMBOLS.shower },
  bathroomSink: { Mesh: BathroomSink, drawSymbol: FURNITURE_SYMBOLS.bathroomSink },
  roundTable: { Mesh: RoundTable, drawSymbol: FURNITURE_SYMBOLS.roundTable },
  squareTable: { Mesh: SquareTable, drawSymbol: FURNITURE_SYMBOLS.squareTable },
  ovalTable: { Mesh: OvalTable, drawSymbol: FURNITURE_SYMBOLS.ovalTable },
  ovalBarTable: { Mesh: OvalBarTable, drawSymbol: FURNITURE_SYMBOLS.ovalBarTable },
  serverRack: { Mesh: ServerRack, drawSymbol: FURNITURE_SYMBOLS.serverRack },
  shelvingUnit: { Mesh: ShelvingUnit, drawSymbol: FURNITURE_SYMBOLS.shelvingUnit },
  wallTv: { Mesh: WallTv, drawSymbol: FURNITURE_SYMBOLS.wallTv },
  wallArt: { Mesh: WallArt, drawSymbol: FURNITURE_SYMBOLS.wallArt },
  wallClock: { Mesh: WallClock, drawSymbol: FURNITURE_SYMBOLS.wallClock },
  wallShelf: { Mesh: WallShelf, drawSymbol: FURNITURE_SYMBOLS.wallShelf },
  coatRack: { Mesh: CoatRack, drawSymbol: FURNITURE_SYMBOLS.coatRack },
  planterBox: { Mesh: PlanterBox, drawSymbol: FURNITURE_SYMBOLS.planterBox },
  divider: { Mesh: Divider, drawSymbol: FURNITURE_SYMBOLS.divider },
})
