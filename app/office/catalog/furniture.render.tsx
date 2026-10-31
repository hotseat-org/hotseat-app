import {
  ArchiveIcon,
  ArmchairIcon,
  BeerIcon,
  CircleIcon,
  ClockIcon,
  CoffeeIcon,
  CookingPotIcon,
  DiscIcon,
  DropletIcon,
  Flower2Icon,
  FrameIcon,
  GlassWaterIcon,
  ImageIcon,
  LampCeilingIcon,
  LampDeskIcon,
  LampWallDownIcon,
  LibraryIcon,
  LockIcon,
  MartiniIcon,
  MonitorIcon,
  PanelTopIcon,
  PanelsLeftBottomIcon,
  PawPrintIcon,
  PresentationIcon,
  PrinterIcon,
  RefrigeratorIcon,
  Rows4Icon,
  ServerIcon,
  ShirtIcon,
  ShowerHeadIcon,
  SofaIcon,
  SproutIcon,
  SquareIcon,
  Table2Icon,
  TableIcon,
  ToiletIcon,
  Trash2Icon,
  TvIcon,
  UmbrellaIcon,
  UtensilsIcon,
  WineIcon,
} from "lucide-react"
import { Armchair } from "../objects/seating/Armchair"
import { BarStool } from "../objects/seating/BarStool"
import { BarTable } from "../objects/tables/BarTable"
import { BathroomSink } from "../objects/bathroom/BathroomSink"
import { Bookshelf } from "../objects/storage/Bookshelf"
import { CeilingLight } from "../objects/lighting/CeilingLight"
import { CoatRack } from "../objects/storage/CoatRack"
import { CoffeeTable } from "../objects/tables/CoffeeTable"
import { Cooler } from "../objects/kitchen/Cooler"
import { Desk } from "../objects/tables/Desk"
import { Deskmate } from "../objects/pets/Deskmate"
import { Divider } from "../objects/decor/Divider"
import { FilingCabinet } from "../objects/storage/FilingCabinet"
import { FloorLamp } from "../objects/lighting/FloorLamp"
import { Fridge } from "../objects/kitchen/Fridge"
import { KitchenCounter } from "../objects/kitchen/KitchenCounter"
import { Lockers } from "../objects/storage/Lockers"
import { MeetingTable } from "../objects/tables/MeetingTable"
import { OvalBarTable } from "../objects/tables/OvalBarTable"
import { OvalTable } from "../objects/tables/OvalTable"
import { Plant } from "../objects/decor/Plant"
import { PlanterBox } from "../objects/decor/PlanterBox"
import { Printer } from "../objects/tech/Printer"
import { RoundTable } from "../objects/tables/RoundTable"
import { Rug } from "../objects/decor/Rug"
import { Seat } from "../objects/seating/Seat"
import { ServerRack } from "../objects/tech/ServerRack"
import { ShelvingUnit } from "../objects/storage/ShelvingUnit"
import { Shower } from "../objects/bathroom/Shower"
import { Sofa } from "../objects/seating/Sofa"
import { SquareTable } from "../objects/tables/SquareTable"
import { Toilet } from "../objects/bathroom/Toilet"
import { TrashBin } from "../objects/storage/TrashBin"
import { TvScreen } from "../objects/tech/TvScreen"
import { VendingMachine } from "../objects/kitchen/VendingMachine"
import { WallArt } from "../objects/decor/WallArt"
import { WallClock } from "../objects/decor/WallClock"
import { WallShelf } from "../objects/decor/WallShelf"
import { WallTv } from "../objects/tech/WallTv"
import { Wardrobe } from "../objects/storage/Wardrobe"
import { Whiteboard } from "../objects/tech/Whiteboard"
import { Workstation } from "../objects/tables/Workstation"
import { DeskmatePreview } from "../objects/pets/DeskmatePreview"
import { FURNITURE_SYMBOLS } from "./furnitureSymbols"
import { FURNITURE_ITEMS } from "./furniture"
import {
  BathroomIcon,
  DecorIcon,
  DesksIcon,
  EquipmentIcon,
  KitchenIcon,
  OnTheWallIcon,
  SeatingIcon,
  StorageIcon,
  TablesIcon,
  composeItemsWithLooks,
  type CategoryDefinition,
} from "~/editor"
import { DESK } from "~/editor/core"
import { msg } from "~/i18n/msg"

// In catalogue order: each category offers its items in the order registered.
/** A desk's screen, in its Desk's space (see objects/tables/Desk.tsx), a hair in front — for a Desk this far back. */
const screenAt = (deskOffset: number) => [
  {
    kind: "screen" as const,
    position: [0, DESK.height + 0.44, -DESK.depth / 2 + 0.2 + deskOffset] as const,
  },
]
/** A lamp's bulb: inside a pendant's bulb, inside a floor lamp's shade. */
const bulbAt = (height: number) => [{ kind: "bulb" as const, position: [0, height, 0] as const }]

/**
 * The office's furniture as the module brings it: each item (furniture.ts,
 * kept apart for the server) with how it looks — its 3D model, plan symbol
 * and catalogue tile.
 */
export const FURNITURE = composeItemsWithLooks(FURNITURE_ITEMS, {
  // The one bookable desk: a desk with its chair (what people book is a seat).
  workstation: {
    Mesh: Workstation,
    glows: screenAt(-0.25),
    drawSymbol: FURNITURE_SYMBOLS.workstation,
    tile: { label: msg("Desk with chair"), icon: LampDeskIcon, key: "4", category: "desks" },
  },
  seat: {
    Mesh: Seat,
    drawSymbol: FURNITURE_SYMBOLS.seat,
    tile: { label: msg("Chair"), icon: ArmchairIcon, key: "7", category: "seating" },
  },
  sofa: {
    Mesh: Sofa,
    drawSymbol: FURNITURE_SYMBOLS.sofa,
    tile: { label: msg("Sofa"), icon: SofaIcon, key: "8", category: "seating" },
  },
  armchair: {
    Mesh: Armchair,
    drawSymbol: FURNITURE_SYMBOLS.armchair,
    tile: { label: msg("Armchair"), icon: ArmchairIcon, category: "seating" },
  },
  barStool: {
    Mesh: BarStool,
    drawSymbol: FURNITURE_SYMBOLS.barStool,
    tile: { label: msg("Bar stool"), icon: BeerIcon, category: "seating" },
  },
  coffeeTable: {
    Mesh: CoffeeTable,
    drawSymbol: FURNITURE_SYMBOLS.coffeeTable,
    tile: { label: msg("Coffee table"), icon: CoffeeIcon, category: "tables" },
  },
  meetingTable: {
    Mesh: MeetingTable,
    drawSymbol: FURNITURE_SYMBOLS.meetingTable,
    tile: { label: msg("Meeting table"), icon: TableIcon, category: "tables" },
  },
  roundTable: {
    Mesh: RoundTable,
    drawSymbol: FURNITURE_SYMBOLS.roundTable,
    tile: { label: msg("Round table"), icon: CircleIcon, category: "tables" },
  },
  squareTable: {
    Mesh: SquareTable,
    drawSymbol: FURNITURE_SYMBOLS.squareTable,
    tile: { label: msg("Café table"), icon: SquareIcon, category: "tables" },
  },
  ovalTable: {
    Mesh: OvalTable,
    drawSymbol: FURNITURE_SYMBOLS.ovalTable,
    tile: { label: msg("Oval table"), icon: DiscIcon, category: "tables" },
  },
  barTable: {
    Mesh: BarTable,
    drawSymbol: FURNITURE_SYMBOLS.barTable,
    tile: { label: msg("Bar table"), icon: MartiniIcon, category: "tables" },
  },
  ovalBarTable: {
    Mesh: OvalBarTable,
    drawSymbol: FURNITURE_SYMBOLS.ovalBarTable,
    tile: { label: msg("Oval bar table"), icon: WineIcon, category: "tables" },
  },
  bookshelf: {
    Mesh: Bookshelf,
    drawSymbol: FURNITURE_SYMBOLS.bookshelf,
    tile: { label: msg("Bookshelf"), icon: LibraryIcon, category: "storage" },
  },
  shelvingUnit: {
    Mesh: ShelvingUnit,
    drawSymbol: FURNITURE_SYMBOLS.shelvingUnit,
    tile: { label: msg("Shelving"), icon: Rows4Icon, category: "storage" },
  },
  filingCabinet: {
    Mesh: FilingCabinet,
    drawSymbol: FURNITURE_SYMBOLS.filingCabinet,
    tile: { label: msg("Filing cabinet"), icon: ArchiveIcon, category: "storage" },
  },
  lockers: {
    Mesh: Lockers,
    drawSymbol: FURNITURE_SYMBOLS.lockers,
    tile: { label: msg("Lockers"), icon: LockIcon, category: "storage" },
  },
  wardrobe: {
    Mesh: Wardrobe,
    drawSymbol: FURNITURE_SYMBOLS.wardrobe,
    tile: { label: msg("Wardrobe"), icon: ShirtIcon, category: "storage" },
  },
  printer: {
    Mesh: Printer,
    drawSymbol: FURNITURE_SYMBOLS.printer,
    tile: { label: msg("Printer"), icon: PrinterIcon, category: "equipment" },
  },
  tvScreen: {
    Mesh: TvScreen,
    drawSymbol: FURNITURE_SYMBOLS.tvScreen,
    tile: { label: msg("Display"), icon: MonitorIcon, category: "equipment" },
  },
  whiteboard: {
    Mesh: Whiteboard,
    drawSymbol: FURNITURE_SYMBOLS.whiteboard,
    tile: { label: msg("Whiteboard"), icon: PresentationIcon, category: "equipment" },
  },
  serverRack: {
    Mesh: ServerRack,
    drawSymbol: FURNITURE_SYMBOLS.serverRack,
    tile: { label: msg("Server rack"), icon: ServerIcon, category: "equipment" },
  },
  kitchenCounter: {
    Mesh: KitchenCounter,
    drawSymbol: FURNITURE_SYMBOLS.kitchenCounter,
    tile: { label: msg("Kitchen counter"), icon: CookingPotIcon, category: "kitchen" },
  },
  fridge: {
    Mesh: Fridge,
    drawSymbol: FURNITURE_SYMBOLS.fridge,
    tile: { label: msg("Fridge"), icon: RefrigeratorIcon, category: "kitchen" },
  },
  cooler: {
    Mesh: Cooler,
    drawSymbol: FURNITURE_SYMBOLS.cooler,
    tile: { label: msg("Water cooler"), icon: GlassWaterIcon, category: "kitchen" },
  },
  vendingMachine: {
    Mesh: VendingMachine,
    drawSymbol: FURNITURE_SYMBOLS.vendingMachine,
    tile: { label: msg("Vending machine"), icon: UtensilsIcon, category: "kitchen" },
  },
  wallTv: {
    Mesh: WallTv,
    drawSymbol: FURNITURE_SYMBOLS.wallTv,
    tile: { label: msg("Wall TV"), icon: TvIcon, category: "wall" },
  },
  wallArt: {
    Mesh: WallArt,
    drawSymbol: FURNITURE_SYMBOLS.wallArt,
    tile: { label: msg("Wall art"), icon: ImageIcon, category: "wall" },
  },
  wallClock: {
    Mesh: WallClock,
    drawSymbol: FURNITURE_SYMBOLS.wallClock,
    tile: { label: msg("Clock"), icon: ClockIcon, category: "wall" },
  },
  wallShelf: {
    Mesh: WallShelf,
    drawSymbol: FURNITURE_SYMBOLS.wallShelf,
    tile: { label: msg("Wall shelf"), icon: PanelTopIcon, category: "wall" },
  },
  toilet: {
    Mesh: Toilet,
    drawSymbol: FURNITURE_SYMBOLS.toilet,
    tile: { label: msg("Toilet"), icon: ToiletIcon, category: "bathroom" },
  },
  bathroomSink: {
    Mesh: BathroomSink,
    drawSymbol: FURNITURE_SYMBOLS.bathroomSink,
    tile: { label: msg("Washbasin"), icon: DropletIcon, category: "bathroom" },
  },
  shower: {
    Mesh: Shower,
    drawSymbol: FURNITURE_SYMBOLS.shower,
    tile: { label: msg("Shower"), icon: ShowerHeadIcon, category: "bathroom" },
  },
  plant: {
    Mesh: Plant,
    drawSymbol: FURNITURE_SYMBOLS.plant,
    tile: { label: msg("Plant"), icon: SproutIcon, key: "9", category: "decor" },
  },
  planterBox: {
    Mesh: PlanterBox,
    drawSymbol: FURNITURE_SYMBOLS.planterBox,
    tile: { label: msg("Planter"), icon: Flower2Icon, category: "decor" },
  },
  divider: {
    Mesh: Divider,
    drawSymbol: FURNITURE_SYMBOLS.divider,
    tile: { label: msg("Divider"), icon: PanelsLeftBottomIcon, category: "decor" },
  },
  rug: {
    Mesh: Rug,
    drawSymbol: FURNITURE_SYMBOLS.rug,
    tile: { label: msg("Rug"), icon: FrameIcon, category: "decor" },
  },
  floorLamp: {
    Mesh: FloorLamp,
    glows: bulbAt(1.55),
    drawSymbol: FURNITURE_SYMBOLS.floorLamp,
    tile: { label: msg("Floor lamp"), icon: LampCeilingIcon, category: "decor" },
  },
  ceilingLight: {
    Mesh: CeilingLight,
    glows: bulbAt(2.18),
    drawSymbol: FURNITURE_SYMBOLS.ceilingLight,
    tile: { label: msg("Ceiling light"), icon: LampWallDownIcon, category: "decor" },
  },
  coatRack: {
    Mesh: CoatRack,
    drawSymbol: FURNITURE_SYMBOLS.coatRack,
    tile: { label: msg("Coat rack"), icon: UmbrellaIcon, category: "decor" },
  },
  trashBin: {
    Mesh: TrashBin,
    drawSymbol: FURNITURE_SYMBOLS.trashBin,
    tile: { label: msg("Trash bin"), icon: Trash2Icon, category: "decor" },
  },
  // Older layouts' desks: no longer placed (no shortcut, not in the catalog),
  // only named — a desk without a chair, and one with a pet always in it.
  desk: {
    Mesh: Desk,
    glows: screenAt(0),
    drawSymbol: FURNITURE_SYMBOLS.desk,
    tile: { label: msg("Desk without chair"), icon: Table2Icon },
  },
  deskmate: {
    Mesh: Deskmate,
    // A still stand-in: the real one floats a name tag and wiggles.
    Thumbnail: DeskmatePreview,
    glows: screenAt(-0.35),
    drawSymbol: FURNITURE_SYMBOLS.deskmate,
    tile: { label: msg("Desk with pet"), icon: PawPrintIcon },
  },
})

/** The catalogue's sections for furniture, after the editor's own. */
export const FURNITURE_CATEGORIES: CategoryDefinition[] = [
  {
    id: "desks",
    label: msg("Desks"),
    icon: DesksIcon,
    // One bookable desk, always with its chair: what people book is a seat,
    // and a desk and chair placed apart read as one but book as neither.
    hint: msg("Bookable — each desk comes with its chair."),
  },
  {
    id: "seating",
    label: msg("Seating"),
    icon: SeatingIcon,
    hint: msg("Not bookable — for meeting tables and lounges."),
    // Chairs aren't bookable: point at the desk that is.
    hintAction: { label: msg("Place a bookable desk"), tool: "workstation" },
  },
  {
    id: "tables",
    label: msg("Tables"),
    icon: TablesIcon,
  },
  {
    id: "storage",
    label: msg("Storage"),
    icon: StorageIcon,
  },
  {
    id: "equipment",
    label: msg("Equipment"),
    icon: EquipmentIcon,
  },
  {
    id: "kitchen",
    label: msg("Kitchen"),
    icon: KitchenIcon,
  },
  {
    id: "wall",
    label: msg("On the wall"),
    icon: OnTheWallIcon,
  },
  {
    id: "bathroom",
    label: msg("Bathroom"),
    icon: BathroomIcon,
  },
  {
    id: "decor",
    label: msg("Decor"),
    icon: DecorIcon,
  },
]
