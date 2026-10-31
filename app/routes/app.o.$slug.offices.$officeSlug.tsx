import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "@heroui/react"
import { ClientOnly } from "remix-utils/client-only"
import {
  data,
  Outlet,
  redirect,
  useFetcher,
  useLoaderData,
  useParams,
  useRevalidator,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router"
import { z } from "zod"
import { getCore } from "~/core/get-core"
import { redirectToRenamedPage } from "~/utils/loader-helpers/redirectToRenamed"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { NOTIFICATION_ACTIONS, revalidateOn } from "~/utils/revalidation"
import { layoutSchema } from "~/office/schema"
import { EditorBoundary } from "~/editor"
import { type SceneObject, type Kit, type KitLibrary } from "~/editor/core"
import type { PreferenceChange } from "~/office/store"
import { SpatialShell, type ShellMember } from "~/components/office/SpatialShell"
import { nameOf } from "~/components/office/shell-ui"
import type { Profile } from "~/core/profile/types"
import { OfficeLayoutError } from "~/core/office/saveLayout"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import type { ReservationActionData } from "~/routes/api.reservations.$slug.$officeSlug"
import { useI18n } from "~/i18n/I18nProvider"
import { getTranslator } from "~/i18n/locale.server"
import { translateError } from "~/i18n/errors"
import {
  addDays,
  isDay,
  maxDay,
  todayIn,
  weekStart,
  type Day,
  type DeskDays,
} from "~/utils/booking"

// three / R3F are browser-only — keep them out of the server bundle.
const loadOfficeEditor = () => import("~/office/OfficeEditor.client")
// In the browser, the editor (the biggest download) starts loading with this
// page's own code — not after hydration, when <ClientOnly> first renders it.
if (typeof window !== "undefined") void loadOfficeEditor()
const OfficeEditor = lazy(loadOfficeEditor)

const toMember = (p: Profile): ShellMember => ({
  userEmail: p.userEmail,
  displayName: p.displayName,
  avatarUrl: p.avatarUrl,
  pet: p.pet,
  role: String(p.role),
})

/**
 * The office: its 3D scene (view + editor) and app chrome. It's the layout of
 * the office's URLs, so it stays mounted while child routes open over it —
 * office settings (`/settings/:section`) render as a modal over the scene.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const slug = z.string().parse(args.params.officeSlug)

  // Old links opened office settings with ?settings=office/<section>.
  const url = new URL(args.request.url)
  const legacy = url.searchParams.get("settings")
  if (legacy?.startsWith("office"))
    throw redirect(
      `/app/o/${args.params.slug}/offices/${slug}/settings/${legacy.split("/")[1] ?? "general"}`
    )
  const core = getCore()
  const organizationSlug = profile.organizationSlug

  const [office, org, members, offices] = await Promise.all([
    core.office.get({ slug, organizationSlug }).catch(async () => {
      // Renamed since this link was made: the same page under its new URL.
      const renamed = await core.office.renamedTo(organizationSlug, slug)
      if (renamed) throw redirectToRenamedPage(args.request, "/offices/", slug, renamed)
      throw data("Office not found", { status: 404, statusText: "Not Found" })
    }),
    // Membership was checked by requireProfile: no re-checks (each one is a
    // database round trip).
    core.organization.getForPublic({ slug: organizationSlug }),
    core.organization.listMembers(organizationSlug),
    core.organization.listOffices(organizationSlug),
  ])

  const parsed = layoutSchema.safeParse(office.layout)

  // Bookings: the chosen day comes from ?day= (shareable, survives a reload).
  // Load everything bookable at once — this week so far through the end of the
  // booking window — so switching days is instant.
  const today = todayIn(office.timezone)
  const from = weekStart(today)
  const lastDay = addDays(today, office.bookingWindowDays)
  const asked = new URL(args.request.url).searchParams.get("day")
  const day: Day = isDay(asked) && asked >= from && asked <= lastDay ? asked : today
  const isAdmin = profile.role === Role.ADMIN
  const [{ reservations, releases }, occupancy, preferences, kits] = await Promise.all([
    core.reservation.listForOffice({
      organizationSlug,
      officeSlug: office.slug,
      from,
      to: maxDay(lastDay, day),
    }),
    // "5 of 9 in today" for each office in the switcher.
    core.office.occupancyToday(organizationSlug, offices.data),
    // Your favourites, usual desk and waitlist days here.
    core.reservation.preferences({
      organizationSlug,
      officeSlug: office.slug,
      userEmail: profile.userEmail,
      from: today,
    }),
    // Saved rooms are for editing the layout: admins only.
    isAdmin ? core.office.listKits(organizationSlug) : [],
  ])

  return {
    initialObjects: parsed.success ? parsed.data : [],
    org: { name: org?.name ?? organizationSlug, slug: organizationSlug },
    office: {
      name: office.name,
      slug: office.slug,
      description: office.description,
      thumbnail: office.thumbnail,
    },
    offices: offices.data.map((o) => ({
      name: o.name,
      slug: o.slug,
      thumbnail: o.thumbnail,
      ...occupancy[o.slug],
    })),
    me: toMember(profile),
    members: members.data.map(toMember),
    // Only admins edit the layout (it also sets who has a permanent desk).
    canEdit: isAdmin,
    kits,
    booking: { today, day, from, lastDay, reservations, releases, preferences },
  }
}

// Opening settings, a sub-dialog or a create modal doesn't change the office.
export const shouldRevalidate = revalidateOn({
  params: ["slug", "officeSlug"],
  unaffectedBy: [NOTIFICATION_ACTIONS],
})

export type LayoutActionData =
  | { ok: true; cancelled: number; moved: number }
  | { ok: false; error?: string; retry: boolean }

export type KitActionData = { ok: boolean }

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args)
  const slug = z.string().parse(args.params.officeSlug)
  const form = await args.request.formData()

  // Saved rooms (kits): kept for the whole organization.
  const intent = form.get("intent")
  if (intent === "kit-save" || intent === "kit-delete") {
    try {
      const scope = { organizationSlug: profile.organizationSlug, userEmail: profile.userEmail }
      if (intent === "kit-save")
        await getCore().office.saveKit({
          ...scope,
          kit: JSON.parse(z.string().parse(form.get("kit"))),
        })
      else await getCore().office.deleteKit({ ...scope, id: z.string().parse(form.get("id")) })
      return data<KitActionData>({ ok: true })
    } catch (error) {
      console.error("Saving a room kit failed", error)
      return data<KitActionData>({ ok: false }, { status: 400 })
    }
  }

  // Report failures as data (not a thrown error) so the editor can show
  // "Couldn't save" and retry, instead of the route error boundary taking over.
  try {
    const layout = layoutSchema.parse(JSON.parse(z.string().parse(form.get("layout"))))
    const { cancelled, moved } = await getCore().office.saveLayout({
      slug,
      organizationSlug: profile.organizationSlug,
      userEmail: profile.userEmail,
      layout,
      // The admin chose to move the bookings this change takes away.
      shouldRehome: form.get("rehome") === "1",
    })
    return data<LayoutActionData>({ ok: true, cancelled, moved })
  } catch (error) {
    const translator = await getTranslator(args.request)
    // Nothing a retry would fix: say why and stop.
    if (error instanceof OfficeLayoutError)
      return data<LayoutActionData>(
        { ok: false, error: translateError(translator, error, "Couldn't save"), retry: false },
        { status: 400 }
      )
    if (error instanceof Error && error.message === "Forbidden")
      return data<LayoutActionData>(
        { ok: false, error: translator.t("Only admins can change the layout."), retry: false },
        { status: 403 }
      )
    console.error("Saving office layout failed", error)
    return data<LayoutActionData>({ ok: false, retry: true }, { status: 500 })
  }
}

const Fallback = () => {
  const { t } = useI18n()
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted">
      {t("Loading the studio…")}
    </div>
  )
}

export default function OfficeRoute() {
  const { initialObjects, offices, me, members, canEdit, booking, kits } =
    useLoaderData<typeof loader>()
  const { t, tn, format } = useI18n()
  // Members as the editor's seat model sees them (email = stable seat id).
  const people = useMemo(() => {
    const toPerson = (m: ShellMember) => ({
      email: m.userEmail,
      name: nameOf(m),
      avatarUrl: m.avatarUrl,
      pet: m.pet,
    })
    return { me: toPerson(me), members: members.map(toPerson) }
  }, [me, members])
  const { slug, officeSlug } = useParams()
  const officeUrl = `/app/o/${slug}/offices/${officeSlug}`
  const fetcher = useFetcher<LayoutActionData>()

  // The latest layout handed to us — what a retry resubmits.
  const latest = useRef<SceneObject[] | null>(null)
  const submit = fetcher.submit
  const onSave = useCallback(
    (objects: SceneObject[], options?: { shouldRehome?: boolean }) => {
      latest.current = objects
      submit(
        { layout: JSON.stringify(objects), ...(options?.shouldRehome && { rehome: "1" }) },
        { method: "post", action: officeUrl }
      )
    },
    [submit, officeUrl]
  )
  const retrySave = useCallback(() => {
    if (latest.current)
      submit({ layout: JSON.stringify(latest.current) }, { method: "post", action: officeUrl })
  }, [submit, officeUrl])
  const saveFailed = fetcher.state === "idle" && fetcher.data?.ok === false
  const retryable = saveFailed && fetcher.data?.ok === false && fetcher.data.retry
  // Keep retrying quietly while it fails (e.g. a blip in connectivity).
  useEffect(() => {
    if (!retryable) return
    const t = setTimeout(retrySave, 5000)
    return () => clearTimeout(t)
  }, [retryable, retrySave])
  // Tell the admin what a save did (or why it can't be saved).
  useEffect(() => {
    const d = fetcher.data
    if (!d) return
    if (!d.ok && d.error) toast.danger(d.error)
    if (d.ok && d.moved > 0)
      toast.success(
        tn(
          d.moved,
          "{n} booking moved to another desk — they've been told.",
          "{n} bookings moved to other desks — they've been told."
        )
      )
    if (d.ok && d.cancelled > 0)
      toast.info(
        tn(
          d.cancelled,
          "{n} upcoming booking was cancelled on removed or permanent desks.",
          "{n} upcoming bookings were cancelled on removed or permanent desks."
        )
      )
  }, [fetcher.data])

  // Saved rooms: changed here at once, saved for the organization meanwhile.
  const [kitList, setKitList] = useState<Kit[]>(kits as Kit[])
  useEffect(() => setKitList(kits as Kit[]), [kits])
  const kitFetcher = useFetcher<KitActionData>()
  const kitSubmit = kitFetcher.submit
  const kitLibrary = useMemo<KitLibrary>(
    () => ({
      kits: kitList,
      addKit: (kit) => {
        setKitList((list) => [kit, ...list])
        kitSubmit(
          { intent: "kit-save", kit: JSON.stringify(kit) },
          { method: "post", action: officeUrl }
        )
      },
      deleteKit: (id) => {
        setKitList((list) => list.filter((k) => k.id !== id))
        kitSubmit({ intent: "kit-delete", id }, { method: "post", action: officeUrl })
      },
    }),
    [kitList, kitSubmit, officeUrl]
  )
  useEffect(() => {
    if (kitFetcher.state === "idle" && kitFetcher.data?.ok === false)
      toast.danger(t("Couldn't save the room. Try again."))
  }, [kitFetcher.state, kitFetcher.data])

  // Desk bookings.
  const bookingFetcher = useFetcher<ReservationActionData>()
  const revalidator = useRevalidator()
  const bookingSubmit = bookingFetcher.submit
  const bookingAction = `/api/reservations/${slug}/${officeSlug}`
  const onReserve = useCallback(
    (picks: DeskDays[]) =>
      bookingSubmit(
        { intent: "reserve", picks: JSON.stringify(picks) },
        { method: "post", action: bookingAction }
      ),
    [bookingSubmit, bookingAction]
  )
  const onCancel = useCallback(
    (dates: Day[]) =>
      bookingSubmit(
        { intent: "cancel", dates: JSON.stringify(dates) },
        { method: "post", action: bookingAction }
      ),
    [bookingSubmit, bookingAction]
  )
  // A permanent resident's days away: give the desk up, or take it back.
  const onRelease = useCallback(
    (deskId: string, dates: Day[]) =>
      bookingSubmit(
        { intent: "release", deskId, dates: JSON.stringify(dates) },
        { method: "post", action: bookingAction }
      ),
    [bookingSubmit, bookingAction]
  )
  const onReclaim = useCallback(
    (deskId: string, dates: Day[]) =>
      bookingSubmit(
        { intent: "reclaim", deskId, dates: JSON.stringify(dates) },
        { method: "post", action: bookingAction }
      ),
    [bookingSubmit, bookingAction]
  )
  // Favourites, your usual desk, the waitlist.
  const onPreference = useCallback(
    (change: PreferenceChange) =>
      bookingSubmit(change as Record<string, string>, { method: "post", action: bookingAction }),
    [bookingSubmit, bookingAction]
  )
  const nameByEmail = useMemo(
    () => new Map(members.map((m) => [m.userEmail, nameOf(m)])),
    [members]
  )
  useEffect(() => {
    const d = bookingFetcher.data
    if (!d) return
    if (!d.ok) {
      toast.danger(d.error)
      // Undo the optimistic change: reload the real bookings.
      revalidator.revalidate()
      return
    }
    if (d.intent === "reserve" && d.conflicts.length) {
      const taken = d.conflicts
        .map((c) => `${format.short(c.date)} (${nameByEmail.get(c.userEmail) ?? t("someone")})`)
        .join(", ")
      toast.warning(
        d.booked.length
          ? t("Booked {days}. Already taken: {taken}.", {
              days: d.booked.map(format.short).join(", "),
              taken,
            })
          : t("Already taken: {taken}.", { taken })
      )
    }
    if (d.intent === "usual") {
      const parts = [
        d.booked.length
          ? t("Booked {days}", { days: d.booked.map(format.short).join(", ") })
          : t("Nothing new to book yet"),
        d.moved.length
          ? t("your usual desk was taken on {days}, so you're at another desk then", {
              days: d.moved.map((m) => format.short(m.date)).join(", "),
            })
          : "",
        d.waiting.length
          ? t("the office is full on {days} — you're on the waitlist", {
              days: d.waiting.map(format.short).join(", "),
            })
          : "",
      ].filter(Boolean)
      toast.success(t("Usual desk set. {details}.", { details: parts.join("; ") }))
    }
    if (d.intent === "waitlist-join")
      toast.success(t("You're on the waitlist — you'll get the first desk that frees up."))
    if (d.intent === "reclaim" && d.taken.length) {
      const taken = d.taken
        .map((x) => `${format.short(x.date)} (${nameByEmail.get(x.userEmail) ?? t("someone")})`)
        .join(", ")
      toast.warning(t("Already booked by someone, so still given up: {taken}.", { taken }))
    }
    // Only react to a new result.
  }, [bookingFetcher.data])

  // Full-bleed: the office is the surface; app chrome floats over it.
  return (
    <div className="fixed inset-0 z-30 bg-background">
      <ClientOnly fallback={<Fallback />}>
        {() => (
          <EditorBoundary>
            <Suspense fallback={<Fallback />}>
              <OfficeEditor
                key={officeSlug}
                initialObjects={initialObjects as SceneObject[]}
                onSave={onSave}
                kitLibrary={kitLibrary}
                saving={fetcher.state !== "idle"}
                saveFailed={saveFailed}
                onRetrySave={retrySave}
                people={people}
                initialMode="display"
                canEdit={canEdit}
                booking={{
                  ...booking,
                  pending: bookingFetcher.state !== "idle",
                  onReserve,
                  onCancel,
                  onRelease,
                  onReclaim,
                  onPreference,
                }}
                displayShell={({ enterEdit, empty, guide }) => (
                  <SpatialShell
                    offices={offices}
                    me={me}
                    members={members}
                    enterEdit={enterEdit}
                    canEdit={canEdit}
                    empty={empty}
                    guide={guide}
                  />
                )}
              />
            </Suspense>
          </EditorBoundary>
        )}
      </ClientOnly>
      {/* Child routes over the scene, e.g. the office settings modal. */}
      <Outlet />
    </div>
  )
}
