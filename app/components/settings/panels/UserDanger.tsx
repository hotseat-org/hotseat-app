import { SettingsCard } from "../ui"
import { Button } from "~/components/Button"

/**
 * Account deletion has no backend yet — shown honestly as unavailable rather
 * than as a button that silently does nothing.
 */
export function UserDanger() {
  return (
    <SettingsCard className="flex flex-col gap-4 border-danger/40 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-black text-foreground">Delete account</p>
        <p className="mt-1 text-sm text-muted">
          Account deletion isn&apos;t available yet. To stop using Hot Seat, leave your
          organizations under Organizations.
        </p>
      </div>
      <Button variant="danger" isDisabled>
        Delete account
      </Button>
    </SettingsCard>
  )
}
