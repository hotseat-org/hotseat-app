import type { EditorBooking } from "./booking/useBookingSync"
import { officeModule } from "./module"
import { OfficeSync } from "./OfficeSync"
import type { People } from "./desks/people"
import { Editor, type EditorProps } from "~/editor/Editor"
import { MOBILE_CHROME } from "~/components/office/mobile"

/** The editor runs with the office's module. */
const MODULES = [officeModule]

interface OfficeEditorProps extends Omit<
  EditorProps,
  "modules" | "persistKey" | "children" | "phoneChrome"
> {
  /** Org members (desk assignment + name tags). Omit standalone. */
  people?: People
  /** Desk booking data + actions for a real office. Omit standalone. */
  booking?: EditorBooking
}

/**
 * The office: the editor with bookable desks — the office module, fed the
 * route's members and booking data. A real office saves through `onSave`;
 * the standalone editor keeps its layout in this browser.
 */
export const OfficeEditor = ({ people, booking, ...props }: OfficeEditorProps) => (
  <Editor {...props} modules={MODULES} persistKey="office-editor:v1" phoneChrome={MOBILE_CHROME}>
    <OfficeSync booking={booking} people={people} />
  </Editor>
)

export default OfficeEditor
