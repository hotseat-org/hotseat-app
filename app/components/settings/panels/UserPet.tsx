import clsx from "clsx"
import { Check, Shuffle } from "lucide-react"
import { useEffect, useState } from "react"
import { useFetcher } from "react-router"
import { CardTitle, SaveBar, SettingsCard } from "../ui"
import { Button } from "~/components/Button"
import { MODELS, petFor, petThumb } from "~/components/OfficeEditor/models"
import { useUser } from "~/utils/remix"

const PROFILE_ACTION = "/api/settings/user/profile"
const FORM = "user-pet"

/**
 * Settings → Desk pet: who sits in your chair on the days you book a desk. A
 * preview of the current pet, then all of them to pick from. Until someone
 * picks, they get one derived from their email ("Picked for you"); "Let
 * Hotseat pick" goes back to that. `picked` is "" for automatic, like the form.
 */
export function UserPet() {
  const { email, pet: saved = "" } = useUser()
  const fetcher = useFetcher()

  const [picked, setPicked] = useState(saved)
  useEffect(() => setPicked(saved), [saved])
  const dirty = picked !== saved

  const auto = petFor(email)
  const current = petFor(email, picked || undefined)

  const surprise = () => {
    const others = MODELS.filter((m) => m.id !== current.id)
    setPicked(others[Math.floor(Math.random() * others.length)].id)
  }

  return (
    <>
      <SettingsCard className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6 sm:!py-[18px] sm:!pl-[18px]">
        <div className="relative h-[124px] w-[150px] shrink-0 overflow-hidden rounded-2xl bg-surface-secondary">
          <div className="absolute inset-x-6 bottom-3.5 h-6 rounded-full bg-foreground/[0.07]" />
          <img
            src={petThumb(current.id)}
            alt={current.label}
            className="absolute left-[27px] top-4 size-24"
          />
          <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[11px] font-extrabold text-accent-foreground">
            You
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[22px] font-black text-foreground">{current.label}</h2>
            {!picked && (
              <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-extrabold text-muted">
                Picked for you
              </span>
            )}
          </div>
          <p className="max-w-[380px] text-sm leading-snug text-muted">
            Sits in your chair on the days you've booked. Everyone in your organizations sees it.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onPress={surprise}>
              <Shuffle className="size-4" />
              Surprise me
            </Button>
            {picked && (
              <Button size="sm" variant="ghost" onPress={() => setPicked("")}>
                Let Hotseat pick
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard className="flex flex-col gap-3.5">
        <CardTitle>Choose a pet</CardTitle>
        <fetcher.Form id={FORM} method="POST" action={PROFILE_ACTION}>
          <input type="hidden" name="intent" value="set-pet" />
          <input type="hidden" name="pet" value={picked} />
          <div
            role="radiogroup"
            aria-label="Desk pet"
            className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
          >
            {MODELS.map((m) => {
              const selected = m.id === current.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  // The derived pet is "picked" by clearing the choice, so it
                  // stays automatic (and follows the email) rather than pinned.
                  onClick={() => setPicked(m.id === auto.id && !saved ? "" : m.id)}
                  className={clsx(
                    "relative flex flex-col items-center gap-0.5 rounded-[14px] border-2 px-1 py-2 transition-[background-color,border-color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-transparent bg-surface-secondary/60 hover:bg-surface-secondary"
                  )}
                >
                  <img src={petThumb(m.id)} alt="" className="size-[58px]" loading="lazy" />
                  <span className="whitespace-nowrap text-[11px] font-extrabold text-foreground">
                    {m.label}
                  </span>
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 grid size-[18px] place-items-center rounded-full bg-accent text-accent-foreground">
                      <Check className="size-[11px]" strokeWidth={3.5} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </fetcher.Form>
      </SettingsCard>

      <SaveBar
        form={FORM}
        dirty={dirty}
        isPending={fetcher.state !== "idle"}
        onDiscard={() => setPicked(saved)}
      />
    </>
  )
}
