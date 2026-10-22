import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react"
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
import { revalidateOn } from "~/utils/revalidation"
import { layoutSchema } from "~/components/OfficeEditor/schema"
import { EditorBoundary } from "~/components/OfficeEditor/EditorBoundary"
import type { SceneObject } from "~/components/OfficeEditor/types"
import { SpatialShell, type ShellMember } from "~/components/office/SpatialShell"
import { nameOf } from "~/components/office/shell-ui"
import type { Profile } from "~/core/profile/types"
import { OfficeLayoutError } from "~/core/office/saveLayout"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import type { ReservationActionData } from "~/routes/api.reservations.$slug.$officeSlug"
import { addDays, formatShort, isDay, maxDay, todayIn, weekStart, type Day } from "~/utils/booking"

// three / R3F are browser-only — keep them out of the server bundle.
const OfficeEditor = lazy(() => import("~/components/OfficeEditor/OfficeEditor.client"))

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
    core.organization.getForUser({ userEmail: profile.userEmail, slug: organizationSlug }),
    core.organization.getMembers({ userEmail: profile.userEmail, slug: organizationSlug }),
    core.organization.getOffices({ userEmail: profile.userEmail, slug: organizationSlug }),
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
  const range = {
    organizationSlug,
    officeSlug: office.slug,
    userEmail: profile.userEmail,
    from,
    to: maxDay(lastDay, day),
  }
  const [reservations, releases] = await Promise.all([
    core.reservation.list(range),
    core.reservation.releases(range),
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
    offices: offices.data.map((o) => ({ name: o.name, slug: o.slug, thumbnail: o.thumbnail })),
    me: toMember(profile),
    members: members.data.map(toMember),
    // Only admins edit the layout (it also sets who has a permanent desk).
    canEdit: profile.role === Role.ADMIN,
    booking: { today, day, from, lastDay, reservations, releases },
  }
}

// Opening settings, a sub-dialog or a create modal doesn't change the office.
export const shouldRevalidate = revalidateOn({ params: ["slug", "officeSlug"] })

export type LayoutActionData =
  | { ok: true; cancelled: number }
  | { ok: false; error?: string; retry: boolean }

export const action = async (args: ActionFunctionArgs) => {
  const profile = await requireProfile(args)
  const slug = z.string().parse(args.params.officeSlug)

  // Report failures as data (not a thrown error) so the editor can show
  // "Couldn't save" and retry, instead of the route error boundary taking over.
  try {
    const form = await args.request.formData()
    const layout = layoutSchema.parse(JSON.parse(z.string().parse(form.get("layout"))))
    const { cancelled } = await getCore().office.saveLayout({
      slug,
      organizationSlug: profile.organizationSlug,
      userEmail: profile.userEmail,
      layout,
    })
    return data<LayoutActionData>({ ok: true, cancelled })
  } catch (error) {
    // Nothing a retry would fix: say why and stop.
    if (error instanceof OfficeLayoutError)
      return data<LayoutActionData>(
        { ok: false, error: error.message, retry: false },
        { status: 400 }
      )
    if (error instanceof Error && error.message === "Forbidden")
      return data<LayoutActionData>(
        { ok: false, error: "Only admins can change the layout.", retry: false },
        { status: 403 }
      )
    console.error("Saving office layout failed", error)
    return data<LayoutActionData>({ ok: false, retry: true }, { status: 500 })
  }
}

const Fallback = () => (
  <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted">
    Loading the studio…
  </div>
)

export default function OfficeRoute() {
  const { initialObjects, offices, me, members, canEdit, booking } = useLoaderData<typeof loader>()
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
    (objects: SceneObject[]) => {
      latest.current = objects
      submit({ layout: JSON.stringify(objects) }, { method: "post", action: officeUrl })
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
    if (d.ok && d.cancelled > 0)
      toast.info(
        `${d.cancelled} upcoming ${d.cancelled === 1 ? "booking was" : "bookings were"} cancelled on removed or permanent desks.`
      )
  }, [fetcher.data])

  // Desk bookings.
  const bookingFetcher = useFetcher<ReservationActionData>()
  const revalidator = useRevalidator()
  const bookingSubmit = bookingFetcher.submit
  const bookingAction = `/api/reservations/${slug}/${officeSlug}`
  const onReserve = useCallback(
    (deskId: string, dates: Day[]) =>
      bookingSubmit(
        { intent: "reserve", deskId, dates: JSON.stringify(dates) },
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
        .map((c) => `${formatShort(c.date)} (${nameByEmail.get(c.userEmail) ?? "someone"})`)
        .join(", ")
      toast.warning(
        d.booked.length
          ? `Booked ${d.booked.map(formatShort).join(", ")}. Already taken: ${taken}.`
          : `Already taken: ${taken}.`
      )
    }
    if (d.intent === "reclaim" && d.taken.length) {
      const taken = d.taken
        .map((t) => `${formatShort(t.date)} (${nameByEmail.get(t.userEmail) ?? "someone"})`)
        .join(", ")
      toast.warning(`Already booked by someone, so still given up: ${taken}.`)
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
                }}
                displayShell={({ enterEdit, empty, guide }) => (
                  <SpatialShell
                    offices={offices}
                    me={me}
                    members={members}
                    officesHref={`/app/o/${slug}/offices`}
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
