import { Input, Label, TextField } from "@heroui/react"
import clsx from "clsx"
import { AlertTriangle, Check, Link2, X } from "lucide-react"
import type { ReactNode } from "react"
import { useLocation } from "react-router"
import type { useRename } from "./useRename"
import { Button } from "~/components/Button"

/** A settings section: one rounded, bordered card. */
export const SettingsCard = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <section className={clsx("rounded-[20px] border border-border bg-surface p-4 md:p-6", className)}>
    {children}
  </section>
)

/** A small bold heading inside a card. */
export const CardTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-base font-black text-foreground">{children}</h2>
)

/**
 * "You have unsaved changes · Discard · Save changes" — sticks to the bottom of
 * the settings panel, shown only while a form is dirty. Submits the form with
 * id `form` (the button sits outside it).
 */
export const SaveBar = ({
  form,
  dirty,
  isPending,
  isDisabled,
  onDiscard,
}: {
  form: string
  dirty: boolean
  isPending: boolean
  isDisabled?: boolean
  onDiscard: () => void
}) =>
  dirty ? (
    <div className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-auto flex items-center gap-3 border-t border-separator bg-surface-secondary px-4 py-3 md:-mx-9 md:-mb-8 md:px-9 md:py-4">
      <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
      <span className="min-w-0 flex-1 text-sm font-bold text-foreground">
        <span className="hidden sm:inline">You have unsaved changes</span>
        <span className="sm:hidden">Unsaved changes</span>
      </span>
      <Button type="button" variant="ghost" onPress={onDiscard} isDisabled={isPending}>
        Discard
      </Button>
      <Button
        type="submit"
        form={form}
        variant="primary"
        isPending={isPending}
        isDisabled={isDisabled}
      >
        Save changes
      </Button>
    </div>
  ) : null

/**
 * Name input whose URL follows it (see useRename): the field, a live URL
 * preview with Available / Taken, and — when the URL will change — a warning
 * that old links stop working.
 */
export const NameField = ({
  rename,
  urlPrefix,
  warning,
}: {
  rename: ReturnType<typeof useRename>
  /** Everything before the slug, e.g. "/app/o/". */
  urlPrefix: string
  warning: string
}) => {
  const location = useLocation()
  return (
    <div className="flex flex-col gap-2">
      {/* Where to come back to if the rename moves the URL (see redirectToRenamed). */}
      <input type="hidden" name="returnTo" value={location.pathname + location.search} />
      <TextField
        isRequired
        name="name"
        value={rename.name}
        onChange={rename.setName}
        isInvalid={rename.taken}
      >
        <Label>Name</Label>
        <Input />
      </TextField>
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
        <Link2 className="size-3.5 shrink-0" />
        <span className="truncate font-mono">
          {urlPrefix}
          <b className="text-foreground">{rename.slug || "…"}</b>
        </span>
        {rename.taken ? (
          <span className="flex shrink-0 items-center gap-1 font-bold text-danger">
            <X className="size-3.5" /> Taken
          </span>
        ) : rename.available ? (
          <span className="flex shrink-0 items-center gap-1 font-bold text-success">
            <Check className="size-3.5" /> Available
          </span>
        ) : null}
      </p>
      {rename.slugChanges && !rename.taken && (
        <p className="flex items-start gap-2 rounded-xl bg-warning/15 px-3 py-2.5 text-xs text-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
          {warning}
        </p>
      )}
    </div>
  )
}
