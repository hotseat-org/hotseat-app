import { Editor, type EditorProps } from "./editor/Editor"
import type { EditorBooking } from "./office/useBookingSync"
import { officeModule } from "./office/module"
import { OfficeSync } from "./office/OfficeSync"
import type { People } from "./office/people"

/** The editor runs with the office's module. */
const MODULES = [officeModule]

interface OfficeEditorProps extends Omit<EditorProps, "modules" | "persistKey" | "children"> {
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
  <Editor {...props} modules={MODULES} persistKey="office-editor:v1">
    <OfficeSync booking={booking} people={people} />
  </Editor>
)

export default OfficeEditor
