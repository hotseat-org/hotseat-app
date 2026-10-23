import { Input, Label, TextField } from "@heroui/react"
import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { Theme, useTheme } from "remix-themes"
import { DeleteAvatarDialog } from "../dialogs/DeleteAvatar"
import { SetAvatarDialog } from "../dialogs/SetAvatar"
import { CardTitle, SaveBar, SettingsCard } from "../ui"
import { useSettings } from "../useSettings"
import { Button } from "~/components/Button"
import { ThumbAvatar } from "~/components/office/shell-ui"
import { ThemeSwitcher } from "~/components/ui/ThemeSwitcher"
import { useUser } from "~/utils/remix"

const PROFILE_ACTION = "/api/settings/user/profile"
const FORM = "user-profile"

export function UserProfile() {
  const { email, displayName = "", photo } = useUser()
  const { dialog, openDialog } = useSettings()
  const fetcher = useFetcher()
  const [theme, , themeMetadata] = useTheme()

  const [name, setName] = useState(displayName)
  useEffect(() => setName(displayName), [displayName])
  const dirty = name.trim() !== displayName.trim()

  return (
    <>
      <SettingsCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        <ThumbAvatar
          src={photo}
          fallback={(displayName || email).slice(0, 1).toUpperCase()}
          className="size-21 shrink-0 rounded-full text-3xl"
        />
        <div className="flex flex-col gap-2">
          <CardTitle>Photo</CardTitle>
          <p className="text-sm text-muted">Shown to your teammates, on desks and in the office.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onPress={() => openDialog("set-avatar")}>
              Upload new
            </Button>
            {photo && (
              <Button size="sm" variant="danger-soft" onPress={() => openDialog("delete-avatar")}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <fetcher.Form
          id={FORM}
          method="POST"
          action={PROFILE_ACTION}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="intent" value="update-profile" />
          <TextField name="displayName" value={name} onChange={setName}>
            <Label>Display name</Label>
            <Input placeholder="How teammates see you" />
          </TextField>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Email</p>
            <p className="text-sm text-muted">{email}</p>
          </div>
        </fetcher.Form>
      </SettingsCard>

      <SettingsCard className="flex items-center justify-between gap-6">
        <div>
          <CardTitle>Appearance</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {/* Following the device: the server can't know which, so say so
                (naming one would differ between server and browser). */}
            {themeMetadata.definedBy === "SYSTEM"
              ? "Same as your device."
              : `${theme === Theme.DARK ? "Dark mode" : "Light mode"} · saved on this device.`}
          </p>
        </div>
        <ThemeSwitcher size="lg" />
      </SettingsCard>

      <SaveBar
        form={FORM}
        dirty={dirty}
        isPending={fetcher.state !== "idle"}
        isDisabled={!name.trim()}
        onDiscard={() => setName(displayName)}
      />

      {dialog === "set-avatar" && <SetAvatarDialog />}
      {dialog === "delete-avatar" && <DeleteAvatarDialog />}
    </>
  )
}
