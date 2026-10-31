import type { OfficeState } from "./state"
import { getModuleStoreHooks } from "~/editor"

const officeStoreHooks = getModuleStoreHooks<OfficeState>()

/** The editor's store, read with the office's state on top (like useEditorStore). */
export const useOfficeStore = officeStoreHooks.useStore
/** The editor's store itself, with the office's state on top (like useEditorStoreApi). */
export const useOfficeStoreApi = officeStoreHooks.useStoreApi
