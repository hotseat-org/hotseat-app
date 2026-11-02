import { EyeOff, MapPin, Settings2 } from "lucide-react"
import { useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { MemberAvatar, nameOf, roleLabel, type ShellMember } from "./shell-ui"
import { useSettings } from "~/components/settings/useSettings"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { InlineModal } from "~/components/ui/InlineModal"
import { useAllPieces } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"
import { deskName } from "~/office/booking/useBooking"
import { isAwayRule } from "~/office/findSeat/matching"
import { MAX_SEAT_RULES } from "~/office/findSeat/seatRulesSchema"
import { useSavedRules, useShowSeatOnMap } from "~/office/findSeat/useFindSeat"
import { useOfficeStore } from "~/office/store"
import { usePersonProfile } from "~/office/usePersonProfile"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { addDays, type Day } from "~/utils/booking"

/**
 * A colleague's profile (`?person=<email>`): who they are, their permanent
 * desk, and where they sit on the days ahead — each a click from the map.
 * Admins can go on to manage them. Opened from Who's in and a desk's card.
 */
export const PersonProfile = ({ me, members }: { me: ShellMember; members: ShellMember[] }) => {
  const profile = usePersonProfile()
  // The desk card (in the 3D scene, outside the router) opens profiles through the store.
  const setShowPerson = useOfficeStore((state) => state.setShowPerson)
  const openProfile = profile.open
  useEffect(() => {
    setShowPerson(openProfile)

    return () => setShowPerson(null)
  }, [setShowPerson, openProfile])
  const member = members.find((candidate) => candidate.userEmail === profile.email)

  if (!profile.email || !member) return null

  return (
    <ProfileDialog
      member={member}
      isMe={member.userEmail === me.userEmail}
      isAdmin={me.role === Role.ADMIN}
      onClose={profile.close}
    />
  )
}

const ProfileDialog = ({
  member,
  isMe,
  isAdmin,
  onClose,
}: {
  member: ShellMember
  isMe: boolean
  isAdmin: boolean
  onClose: () => void
}) => {
  const i18n = useI18n()
  const { t, format } = i18n
  const pieces = useAllPieces()
  const booking = useOfficeStore((state) => state.booking)
  const showOnMap = useShowSeatOnMap()
  const { open: openSettings } = useSettings()
  const name = nameOf(member)

  const permanentDesk = pieces.find((piece) => piece.assignee === member.userEmail)
  // Their desk on each day from today to the end of the booking window.
  const days = useMemo(() => {
    const found: { day: Day; deskId: string }[] = []
    if (!booking.today) return found

    for (let day = booking.today; day <= booking.lastDay; day = addDays(day, 1)) {
      const desks = booking.byDay[day] ?? {}
      const deskId = Object.keys(desks).find((id) => desks[id] === member.userEmail)
      if (deskId) found.push({ day, deskId })
    }

    return found
  }, [booking.today, booking.lastDay, booking.byDay, member.userEmail])

  const showDesk = (deskId: string, day: Day) => {
    showOnMap(deskId, day)
    onClose()
  }

  // At the end of the page, like the office's panels: over them, outside the
  // shell's own layer (which a panel opened from would otherwise cover).
  return createPortal(
    <InlineModal
      label={name}
      onClose={onClose}
      className="flex max-h-[min(640px,86vh)] w-[min(420px,94vw)] flex-col rounded-[calc(var(--radius)*3)] border border-border bg-overlay p-5 text-foreground shadow-overlay"
    >
      <header className="flex items-start gap-4">
        <MemberAvatar m={member} className="size-16 shrink-0 rounded-2xl text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-black">{isMe ? t("You") : name}</h2>
          <p className="truncate text-sm text-muted">{member.userEmail}</p>
          <p className="mt-1 text-xs font-bold text-muted">{roleLabel(i18n, member.role)}</p>
        </div>
        <DialogCloseButton onClose={onClose} />
      </header>

      <div className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        {permanentDesk && (
          <section>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
              {t("Permanent desk")}
            </h3>
            <DeskRow
              label={deskName(i18n, permanentDesk)}
              onShow={() => showDesk(permanentDesk.id, booking.day || booking.today)}
            />
          </section>
        )}

        <section>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
            {t("In the office")}
          </h3>
          {days.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              {permanentDesk ? t("At their own desk.") : t("No days booked ahead.")}
            </p>
          ) : (
            <ul className="mt-1 flex flex-col">
              {days.map(({ day, deskId }) => {
                const desk = pieces.find((piece) => piece.id === deskId)

                return (
                  <li key={day}>
                    <DeskRow
                      label={`${format.long(day)} · ${desk ? deskName(i18n, desk) : t("A desk")}`}
                      onShow={() => showDesk(deskId, day)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {!isMe && <AvoidToggle email={member.userEmail} name={name} />}

      {isAdmin && !isMe && (
        <footer className="mt-4 border-t border-separator pt-4">
          <button
            type="button"
            // Over the profile: closing the settings comes back to it.
            onClick={() => openSettings("org", "members")}
            className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-accent hover:bg-accent/10"
          >
            <Settings2 className="size-4" /> {t("Manage in members")}
          </button>
        </footer>
      )}
    </InlineModal>,
    document.body
  )
}

/**
 * Sit away from someone: an away rule in your own booking preferences for
 * this office (Find a seat keeps you clear of them). Yours alone — nobody
 * else, admins included, ever sees it.
 */
const AvoidToggle = ({ email, name }: { email: string; name: string }) => {
  const { t } = useI18n()
  const { rules, setRules } = useSavedRules()
  const isAvoided = rules.some(
    (rule) => rule.kind === "colleague" && rule.email === email && isAwayRule(rule)
  )
  // Its own: any other rule about them goes (you can't prefer and avoid someone).
  const others = rules.filter((rule) => !(rule.kind === "colleague" && rule.email === email))
  const isFull = !isAvoided && others.length >= MAX_SEAT_RULES

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3">
      <label className="flex cursor-pointer items-center gap-3">
        <EyeOff className="size-5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {t("Avoid sitting near {name}", { name })}
          </span>
          <span className="block text-xs text-muted">
            {t("Only you can see this. Find a seat keeps you away from them.")}
          </span>
        </span>
        <input
          type="checkbox"
          checked={isAvoided}
          disabled={isFull}
          onChange={() =>
            setRules(
              isAvoided
                ? others
                : [...others, { kind: "colleague", email, strength: "prefer", isAway: true }]
            )
          }
          className="size-5 shrink-0 accent-[var(--accent)]"
        />
      </label>
    </section>
  )
}

/** A desk (and when), with a way to see it on the map. */
const DeskRow = ({ label, onShow }: { label: string; onShow: () => void }) => {
  const { t } = useI18n()

  return (
    <div className="flex min-h-11 items-center gap-3">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
      <button
        type="button"
        onClick={onShow}
        className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-default px-3 text-sm font-bold"
      >
        <MapPin className="size-4" /> {t("Show")}
      </button>
    </div>
  )
}
