import { Modal } from "@heroui/react"
import clsx from "clsx"
import { AlertTriangle, Armchair, Check, Search, X } from "lucide-react"
import { useMemo, useState } from "react"
import { isSeatable } from "../catalog"
import { deskName, useDeskFloor } from "../booking/useBooking"
import { useOfficeStore } from "../store"
import { SeatAvatar } from "./SeatAvatar"
import { usePeople, type Person } from "./people"
import { useAllPieces } from "~/editor"
import { type SceneObject } from "~/editor/core"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"
import { useIsMobile } from "~/utils/hooks/useIsMobile"

/** Who's listed: everyone, those without a permanent desk here, or those with one. */
type Filter = "all" | "free" | "resident"

/** Rows drawn at most: a big organization is narrowed down by the search. */
const MAX_ROWS = 100

/** For searching: lower case, without accents ("Šťastná" is found by "stastna"). */
const toSearchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/** A day someone has booked a desk. */
interface Booked {
  day: Day
  email: string
}

/**
 * Choosing a desk's permanent resident: everyone in the organization,
 * searched by name or email and filtered by whether they already have a
 * desk here. What a choice does to bookings is said before it happens — the
 * desk's bookings by others, the person's own bookings here, the desk they'd
 * move from — and confirmed first.
 */
export const ResidentPicker = ({ deskId, onClose }: { deskId: string; onClose: () => void }) => {
  const pieces = useAllPieces()
  const desk = pieces.find((piece) => piece.id === deskId)
  const isPhone = useIsMobile()
  if (!desk) return null

  return (
    <Modal.Backdrop isOpen onOpenChange={(isOpen) => !isOpen && onClose()} isDismissable>
      <Modal.Container scroll="inside" placement={isPhone ? "bottom" : "auto"}>
        <Modal.Dialog
          className={clsx(
            "flex max-w-full flex-col overflow-hidden p-0",
            isPhone
              ? "mt-auto h-[calc(var(--visual-viewport-height)-44px)] w-full rounded-t-3xl rounded-b-none"
              : "h-[min(640px,85vh)] w-[520px] rounded-[calc(var(--radius)*3)]"
          )}
        >
          <ResidentPickerBody desk={desk} pieces={pieces} onClose={onClose} />
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

const ResidentPickerBody = ({
  desk,
  pieces,
  onClose,
}: {
  desk: SceneObject
  pieces: SceneObject[]
  onClose: () => void
}) => {
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const people = usePeople()
  const getDeskFloor = useDeskFloor()
  const assignSeat = useOfficeStore((state) => state.assignSeat)
  const byDay = useOfficeStore((state) => state.booking.byDay)
  const today = useOfficeStore((state) => state.booking.today)
  const isBookingOn = useOfficeStore((state) => state.booking.enabled)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  /** Picked, but it would cancel bookings or move them: confirmed first. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  // Each resident's desk in this office (any floor).
  const residentDesks = useMemo(
    () =>
      new Map(
        pieces.flatMap((piece) =>
          piece.assignee && isSeatable(piece.type) ? [[piece.assignee, piece] as const] : []
        )
      ),
    [pieces]
  )
  // Upcoming bookings in this office, by day: on this desk, and everyone's.
  const upcoming = useMemo(
    () =>
      isBookingOn
        ? Object.entries(byDay)
            .filter(([date]) => date >= today)
            .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
        : [],
    [isBookingOn, byDay, today]
  )
  const deskBookings: Booked[] = useMemo(
    () =>
      upcoming.flatMap(([date, desks]) =>
        desks[desk.id] ? [{ day: date as Day, email: desks[desk.id] }] : []
      ),
    [upcoming, desk.id]
  )
  const ownDaysByEmail = useMemo(() => {
    const days = new Map<string, Day[]>()
    for (const [date, desks] of upcoming)
      for (const email of Object.values(desks))
        days.set(email, [...(days.get(email) ?? []), date as Day])

    return days
  }, [upcoming])

  const nameOf = (email: string) =>
    people.members.find((member) => member.email === email)?.name ?? email
  const describeDesk = (piece: SceneObject) =>
    [deskName(i18n, piece), getDeskFloor(piece)].filter(Boolean).join(" · ")
  /** What making `email` the resident does: bookings it cancels, the desk it frees. */
  const getImpact = (email: string) => {
    const lostBookings = deskBookings.filter((booking) => booking.email !== email)
    const ownDays = ownDaysByEmail.get(email) ?? []
    const previousDesk = residentDesks.get(email)
    const movesFrom = previousDesk && previousDesk.id !== desk.id ? previousDesk : null

    return { lostBookings, ownDays, movesFrom }
  }

  /** Under a person's name: this desk is theirs, the desk they have, or their email. */
  const getRowDetail = (member: Person, isCurrent: boolean, movesFrom: SceneObject | null) => {
    if (isCurrent) return t("This desk's resident")
    if (movesFrom) return t("Has {desk}", { desk: describeDesk(movesFrom) })

    return member.email
  }

  const pick = (email: string | null) => {
    if (email === (desk.assignee ?? null)) return onClose()

    if (email) {
      const { lostBookings, ownDays, movesFrom } = getImpact(email)
      if (lostBookings.length > 0 || ownDays.length > 0 || movesFrom) return setPendingEmail(email)
    }

    assignSeat(desk.id, email)
    onClose()
  }

  const counts = {
    all: people.members.length,
    free: people.members.filter((member) => !residentDesks.has(member.email)).length,
    resident: people.members.filter((member) => residentDesks.has(member.email)).length,
  }
  const searchable = toSearchable(query.trim())
  const listed = people.members
    .filter((member) => {
      if (filter === "free" && residentDesks.has(member.email)) return false
      if (filter === "resident" && !residentDesks.has(member.email)) return false

      return (
        !searchable ||
        toSearchable(member.name).includes(searchable) ||
        toSearchable(member.email).includes(searchable)
      )
    })
    // This desk's resident first, then by name.
    .sort(
      (first, second) =>
        Number(second.email === desk.assignee) - Number(first.email === desk.assignee) ||
        first.name.localeCompare(second.name)
    )
  const shown = listed.slice(0, MAX_ROWS)
  const isNoneListed = !searchable && filter !== "resident"

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("Everyone") },
    { id: "free", label: t("Without a desk") },
    { id: "resident", label: t("With a desk") },
  ]

  return (
    <>
      <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border pl-6 pr-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/10 text-accent">
          <Armchair className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Modal.Heading className="block truncate text-lg font-black text-foreground">
            {t("Permanent resident")}
          </Modal.Heading>
          <p className="truncate text-[13px] text-muted">{describeDesk(desk)}</p>
        </div>
        <button
          type="button"
          aria-label={t("Close")}
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X className="size-[18px]" strokeWidth={2.4} />
        </button>
      </div>

      {pendingEmail ? (
        <ConfirmResident
          name={nameOf(pendingEmail)}
          impact={getImpact(pendingEmail)}
          nameOf={nameOf}
          describeDesk={describeDesk}
          onBack={() => setPendingEmail(null)}
          onConfirm={() => {
            assignSeat(desk.id, pendingEmail)
            onClose()
          }}
        />
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-2.5 px-6 pt-4 pb-3">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:ring-2 focus-within:ring-focus">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("Search by name or email")}
                aria-label={t("Search by name or email")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Show")}>
              {filters.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                  className={clsx(
                    "h-7 rounded-full border px-2.5 text-xs font-bold transition-colors",
                    filter === id
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted hover:border-muted hover:text-foreground"
                  )}
                >
                  {label} <span className="font-semibold opacity-70">{counts[id]}</span>
                </button>
              ))}
            </div>
            {/* Whoever becomes its resident, these go: said once, up top. */}
            {deskBookings.length > 0 && (
              <p className="flex gap-2 rounded-xl bg-warning/15 px-3 py-2 text-xs text-foreground">
                <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
                <span>
                  {t("Booked: {bookings}. A resident takes it from them.", {
                    bookings: deskBookings
                      .map((booking) => `${nameOf(booking.email)} (${format.short(booking.day)})`)
                      .join(", "),
                  })}
                </span>
              </p>
            )}
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {isNoneListed && (
              <li>
                <PickerRow
                  isCurrent={!desk.assignee}
                  onPress={() => pick(null)}
                  avatar={
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-muted text-muted">
                      <Armchair className="size-4" />
                    </span>
                  }
                  title={t("No resident")}
                  detail={t("Anyone can book it")}
                />
              </li>
            )}
            {shown.map((member) => {
              const { ownDays, movesFrom } = getImpact(member.email)
              const isCurrent = member.email === desk.assignee

              return (
                <li key={member.email}>
                  <PickerRow
                    isCurrent={isCurrent}
                    onPress={() => pick(member.email)}
                    avatar={<PersonAvatar person={member} />}
                    title={member.name}
                    detail={getRowDetail(member, isCurrent, movesFrom)}
                    warning={
                      !isCurrent && ownDays.length > 0
                        ? tn(
                            ownDays.length,
                            "Their {n} booking here would be cancelled",
                            "Their {n} bookings here would be cancelled"
                          )
                        : undefined
                    }
                  />
                </li>
              )
            })}
            {listed.length === 0 && (
              <li className="px-2 py-10 text-center text-sm text-muted">
                {t("Nobody matches “{query}”", { query: query.trim() })}
              </li>
            )}
            {listed.length > shown.length && (
              <li className="px-2 pt-3 text-center text-xs text-muted">
                {t("Showing {shown} of {total} — search to narrow it down", {
                  shown: shown.length,
                  total: listed.length,
                })}
              </li>
            )}
          </ul>
        </>
      )}
    </>
  )
}

const PersonAvatar = ({ person }: { person: Person }) => (
  <SeatAvatar person={person} email={person.email} isMine={false} size={36} />
)

const PickerRow = ({
  isCurrent,
  onPress,
  avatar,
  title,
  detail,
  warning,
}: {
  isCurrent: boolean
  onPress: () => void
  avatar: React.ReactNode
  title: string
  detail: string
  warning?: string
}) => (
  <button
    type="button"
    aria-pressed={isCurrent}
    onClick={onPress}
    className={clsx(
      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
      isCurrent ? "bg-accent/10" : "hover:bg-foreground/5"
    )}
  >
    {avatar}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-bold text-foreground">{title}</span>
      <span className="block truncate text-xs text-muted">{detail}</span>
      {warning && (
        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-warning">
          <AlertTriangle className="size-3 shrink-0" />
          <span className="truncate">{warning}</span>
        </span>
      )}
    </span>
    {isCurrent && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.6} />}
  </button>
)

/** Before a resident is set who'd cancel bookings or leave another desk: what happens, confirmed. */
const ConfirmResident = ({
  name,
  impact: { lostBookings, ownDays, movesFrom },
  nameOf,
  describeDesk,
  onBack,
  onConfirm,
}: {
  name: string
  impact: { lostBookings: Booked[]; ownDays: Day[]; movesFrom: SceneObject | null }
  nameOf: (email: string) => string
  describeDesk: (desk: SceneObject) => string
  onBack: () => void
  onConfirm: () => void
}) => {
  const { t, format } = useI18n()
  const isCancelling = lostBookings.length > 0 || ownDays.length > 0
  const isTakingDesks = lostBookings.length > 0
  const consequences = [
    movesFrom &&
      t("{name} leaves {desk}, which anyone can book then.", {
        name,
        desk: describeDesk(movesFrom),
      }),
    lostBookings.length > 0 &&
      t("Booked on this desk, these lose it: {bookings}.", {
        bookings: lostBookings
          .map((booking) => `${nameOf(booking.email)} (${format.short(booking.day)})`)
          .join(", "),
      }),
    ownDays.length > 0 &&
      t("{name}'s own bookings here are cancelled ({days}): this desk is theirs every day.", {
        name,
        days: ownDays.map(format.short).join(", "),
      }),
  ].filter(Boolean)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <p className="text-sm font-bold text-foreground">
          {t("Make {name} its permanent resident?", { name })}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {consequences.map((consequence) => (
            <li
              key={String(consequence)}
              className="flex gap-2 rounded-xl bg-warning/15 px-3 py-2 text-xs text-foreground"
            >
              <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
              <span>{consequence}</span>
            </li>
          ))}
        </ul>
        {isTakingDesks && (
          <p className="mt-3 text-xs text-muted">
            {t(
              "Next you choose what happens to them: moved to the nearest free desks, or cancelled. Everyone affected is told."
            )}
          </p>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          className="h-10 rounded-xl px-4 text-sm font-bold text-foreground hover:bg-foreground/5"
        >
          {t("Back")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={clsx(
            "h-10 rounded-xl px-4 text-sm font-bold",
            isCancelling ? "bg-warning text-warning-foreground" : "bg-accent text-accent-foreground"
          )}
        >
          {isCancelling ? t("Assign anyway") : t("Assign")}
        </button>
      </div>
    </div>
  )
}
