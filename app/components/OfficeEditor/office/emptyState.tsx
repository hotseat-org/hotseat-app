import type { EmptyStateProps } from "../editor/module"
import { EmptyOffice } from "./ui/EmptyOffice"
import { OfficeNotSetUp } from "./OfficeNotSetUp"

/**
 * An empty office: for an admin, a blank floor or a ready-made layout; for
 * everyone else, why there's nothing here yet.
 */
export const OfficeEmptyState = ({
  canEdit,
  readOnly,
  isEditable,
  onEnterEdit,
  onDismiss,
}: EmptyStateProps) =>
  canEdit ? (
    <EmptyOffice
      readOnly={readOnly}
      isEditable={isEditable}
      onEnterEdit={onEnterEdit}
      onDismiss={onDismiss}
    />
  ) : (
    <OfficeNotSetUp />
  )
