import { officeModule } from "./module"
import type { OfficeData } from "./useOfficeData"
import { Editor, type EditorProps } from "~/editor/Editor"
import { MOBILE_CHROME } from "~/components/office/mobile"

/** The editor runs with the office's module. */
const MODULES = [officeModule]

type OfficeEditorProps = Omit<
  EditorProps,
  "modules" | "moduleData" | "persistKey" | "phoneChrome"
> &
  OfficeData

/**
 * The office: the editor with bookable desks — the office module, fed the
 * route's members and booking data. A real office saves through `onSave`;
 * the standalone editor keeps its layout in this browser.
 */
export const OfficeEditor = ({ people, booking, ...props }: OfficeEditorProps) => (
  <Editor
    {...props}
    modules={MODULES}
    moduleData={{ office: { people, booking } }}
    persistKey="office-editor:v1"
    phoneChrome={MOBILE_CHROME}
  />
)

export default OfficeEditor
