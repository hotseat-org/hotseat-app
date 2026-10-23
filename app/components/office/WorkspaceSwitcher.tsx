import { Popover, Tooltip } from "@heroui/react"
import { Building2, ChevronDown, Plus, Settings } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link, useNavigate, useParams } from "react-router"
import { MOBILE_CHROME } from "./mobile"
import { PANEL, ThumbAvatar, type ShellOffice } from "./shell-ui"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { useProfile } from "~/utils/remix"

interface Props {
  /** Offices in the current org (empty on the no-office screen). */
  offices: ShellOffice[]
  /**
   * Phones: the organization as its logo only (so the office name fits), and
   * no panel of its own — it sits in the phone's top bar.
   */
  isCompact?: boolean
  /** Placement; floats top-left by default. */
  className?: string
}

/**
 * Switch organization and office from anywhere under an org route — as a
 * breadcrumb of two pills, "Org ▾ / Office ▾": org and office are different
 * levels, so each gets its own small, focused menu (like Vercel's team /
 * project switchers). Each menu leads with the current one (and its settings),
 * then the others. Desktop: popovers. Phones: each drops down from the top bar
 * as a full-width panel.
 */
export const WorkspaceSwitcher = ({
  offices,
  isCompact = false,
  className = "absolute left-5 top-5",
}: Props) => {
  const d = useSwitcher(offices)
  const [open, setOpen] = useState<"org" | "office" | null>(null)
  const close = () => setOpen(null)
  const toggle = (menu: "org" | "office") => setOpen((current) => (current === menu ? null : menu))
  const go = (to: string) => {
    close()
    d.navigate(to)
  }
  const orgMenu = <OrgMenu d={d} onClose={close} onGo={go} />
  const officeMenu = <OfficeMenu d={d} offices={offices} onClose={close} onGo={go} />
  const orgTrigger = (
    <>
      <OrgLogo
        src={d.organization.thumbnailUrl}
        name={d.organization.name}
        className="size-8 rounded-lg"
      />
      {!isCompact && (
        <span className="max-w-36 truncate text-sm font-extrabold text-foreground">
          {d.organization.name}
        </span>
      )}
      <ChevronDown className="size-3.5 text-muted" />
    </>
  )
  const officeTrigger = (
    <>
      {/* Its cover, sized like the org's logo: both halves the same height. */}
      {d.currentOffice ? (
        <ThumbAvatar
          src={d.currentOffice.thumbnail}
          fallback={d.currentOffice.name.slice(0, 1).toUpperCase()}
          className="size-8 shrink-0 rounded-lg"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center">
          <Building2 className="size-4 text-accent" />
        </span>
      )}
      <span
        className={`min-w-0 truncate text-sm font-semibold text-foreground ${isCompact ? "" : "max-w-36"}`}
      >
        {d.currentOffice?.name ?? (offices.length ? "Select office" : "No offices")}
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-muted" />
    </>
  )

  if (isCompact)
    return (
      <div
        className={`pointer-events-auto rounded-2xl ${className} flex min-w-0 items-center gap-0.5`}
      >
        <button
          type="button"
          aria-label="Switch organization"
          aria-expanded={open === "org"}
          onClick={() => toggle("org")}
          className={`${TRIGGER} shrink-0 ${open === "org" ? "bg-surface-secondary" : ""}`}
        >
          {orgTrigger}
        </button>
        <span className="shrink-0 px-0.5 text-lg font-light text-muted/50">/</span>
        <button
          type="button"
          aria-label="Switch office"
          aria-expanded={open === "office"}
          onClick={() => toggle("office")}
          className={`${TRIGGER} min-w-0 ${open === "office" ? "bg-surface-secondary" : ""}`}
        >
          {officeTrigger}
        </button>
        {open && (
          <DropPanel label={open === "org" ? "Organizations" : "Offices"} onClose={close}>
            {open === "org" ? orgMenu : officeMenu}
          </DropPanel>
        )}
      </div>
    )

  return (
    <div className={`${PANEL} p-1.5 ${className} flex min-w-0 items-center gap-0.5`}>
      <Popover isOpen={open === "org"} onOpenChange={(isOpen) => setOpen(isOpen ? "org" : null)}>
        <Popover.Trigger className="shrink-0">
          <div role="button" tabIndex={0} aria-label="Switch organization" className={TRIGGER}>
            {orgTrigger}
          </div>
        </Popover.Trigger>
        <Popover.Content placement="bottom start" offset={10} className={MENU}>
          <Popover.Dialog className="flex w-80 flex-col gap-0.5 p-2 outline-none">
            {orgMenu}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      <span className="shrink-0 px-0.5 text-lg font-light text-muted/50">/</span>

      <Popover
        isOpen={open === "office"}
        onOpenChange={(isOpen) => setOpen(isOpen ? "office" : null)}
      >
        {/* The part that gives way when space is short: its name truncates. */}
        <Popover.Trigger className="min-w-0">
          <div
            role="button"
            tabIndex={0}
            aria-label="Switch office"
            className={`${TRIGGER} min-w-0`}
          >
            {officeTrigger}
          </div>
        </Popover.Trigger>
        <Popover.Content placement="bottom start" offset={10} className={MENU}>
          <Popover.Dialog className="flex w-80 flex-col gap-0.5 p-2 outline-none">
            {officeMenu}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  )
}

type Switcher = ReturnType<typeof useSwitcher>

/** The organization menu: the current one (with its settings), the others, New organization. */
const OrgMenu = ({
  d,
  onClose,
  onGo,
}: {
  d: Switcher
  onClose: () => void
  onGo: (to: string) => void
}) => (
  <>
    <CurrentHeader
      lead={
        <OrgLogo
          src={d.organization.thumbnailUrl}
          name={d.organization.name}
          className="size-9 rounded-xl"
        />
      }
      label={d.organization.name}
      sub={d.currentOrg && orgDetail(d.currentOrg)}
      settingsLabel="Organization settings"
      // Settings are an admin's: members don't get the gear.
      onSettings={
        d.isAdmin
          ? () => {
              onClose()
              d.openSettings("org", "general")
            }
          : undefined
      }
    />
    {d.otherOrgs.length > 0 && (
      <>
        <SectionLabel>Other organizations</SectionLabel>
        {d.otherOrgs.map((o) => (
          <Row
            key={o.slug}
            lead={<OrgLogo src={o.thumbnailUrl} name={o.name} className="size-9 rounded-xl" />}
            label={o.name}
            sub={orgDetail(o)}
            onClick={() => onGo(`/app/o/${o.slug}`)}
          />
        ))}
      </>
    )}
    <Divider />
    <CreateLink to="?modal=new-organization" label="New organization" onClick={onClose} />
  </>
)

/** The office menu: the current one (how full, its settings), the others, New office. */
const OfficeMenu = ({
  d,
  offices,
  onClose,
  onGo,
}: {
  d: Switcher
  offices: ShellOffice[]
  onClose: () => void
  onGo: (to: string) => void
}) => {
  const otherOffices = offices.filter((o) => o.slug !== d.officeSlug)
  return (
    <>
      {d.currentOffice && (
        <CurrentHeader
          lead={<OfficeThumb o={d.currentOffice} />}
          label={d.currentOffice.name}
          sub={occupancyDetail(d.currentOffice)}
          settingsLabel="Office settings"
          onSettings={
            d.isAdmin
              ? () => {
                  onClose()
                  d.openSettings("office", "general")
                }
              : undefined
          }
        />
      )}
      {otherOffices.length > 0 ? (
        <>
          <SectionLabel>{d.currentOffice ? "Other offices" : "Offices"}</SectionLabel>
          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {otherOffices.map((o) => (
              <Row
                key={o.slug}
                lead={<OfficeThumb o={o} />}
                label={o.name}
                sub={occupancyDetail(o)}
                onClick={() => onGo(`/app/o/${d.slug}/offices/${o.slug}`)}
              />
            ))}
          </div>
        </>
      ) : (
        !d.isAdmin && <p className="px-2 py-2 text-sm text-muted">No other offices.</p>
      )}
      {d.isAdmin && (
        <>
          <Divider />
          <CreateLink to="?modal=new-office" label="New office" onClick={onClose} />
        </>
      )}
    </>
  )
}

/**
 * Phones: a menu dropping down from the top bar, full width. Portalled — the
 * bar's backdrop blur would otherwise contain it — and placed under the bar,
 * which stays usable (tap the other half to switch menus). Esc or a tap on the
 * scrim closes it.
 */
const DropPanel = ({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: ReactNode
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50"
      style={{ top: MOBILE_CHROME.top }}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="pointer-events-auto absolute inset-0 bg-foreground/25"
      />
      <div
        role="dialog"
        aria-label={label}
        className="drop-down pointer-events-auto absolute inset-x-0 top-0 flex max-h-[70dvh] flex-col gap-0.5 overflow-y-auto rounded-b-3xl border-b border-chrome-border bg-chrome p-3 shadow-[0_18px_40px_-14px_var(--chrome-shadow)]"
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

const TRIGGER =
  "flex cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"

// ─── Building blocks ─────────────────────────────────────────────────────────

const useSwitcher = (offices: ShellOffice[]) => {
  const { organization, organizations } = useOrganizationContext()
  const isAdmin = useProfile().role === Role.ADMIN
  const { open: openSettings } = useSettings()
  const navigate = useNavigate()
  const { slug, officeSlug } = useParams()
  return {
    organization,
    organizations,
    currentOrg: organizations.find((o) => o.slug === organization.slug),
    otherOrgs: organizations.filter((o) => o.slug !== organization.slug),
    isAdmin,
    openSettings,
    navigate,
    slug,
    currentOffice: offices.find((o) => o.slug === officeSlug),
    officeSlug,
  }
}
type Org = ReturnType<typeof useOrganizationContext>["organizations"][number]

/** "Admin · 4 members" */
const orgDetail = (org: Org) =>
  `${org.role === Role.ADMIN ? "Admin" : "Member"} · ${org.memberCount} member${org.memberCount === 1 ? "" : "s"}`

/** "5 of 9 in today", "Nobody in today", "No desks yet". */
const occupancyDetail = (o: ShellOffice) => {
  if (o.seats === undefined || o.inToday === undefined) return undefined
  if (o.seats === 0) return "No desks yet"
  if (o.inToday === 0) return "Nobody in today"
  return `${o.inToday} of ${o.seats} in today`
}

/** The current org/office atop its menu: highlighted, with a gear for its settings (admins). */
const CurrentHeader = ({
  lead,
  label,
  sub,
  settingsLabel,
  onSettings,
}: {
  lead: ReactNode
  label: string
  sub?: string
  settingsLabel: string
  /** Absent: no gear (the settings aren't yours to change). */
  onSettings?: () => void
}) => (
  <div className="flex min-h-[52px] items-center gap-3 rounded-xl bg-accent/10 py-1 pl-2 pr-1">
    {lead}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-extrabold text-foreground">{label}</span>
      {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
    </span>
    {onSettings && (
      <Tooltip delay={350}>
        <button
          type="button"
          onClick={onSettings}
          aria-label={settingsLabel}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Settings className="size-[18px]" />
        </button>
        <Tooltip.Content
          placement="right"
          className="rounded-md border border-border bg-overlay px-2 py-1 text-xs text-foreground shadow-overlay"
        >
          {settingsLabel}
        </Tooltip.Content>
      </Tooltip>
    )}
  </div>
)

const Divider = () => <div className="mx-1 my-1.5 h-px bg-separator" />

const OrgLogo = ({ src, name, className }: { src?: string; name: string; className: string }) => (
  <ThumbAvatar src={src} fallback={name.slice(0, 1).toUpperCase()} className={className} />
)

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-2 pb-1 pt-2 text-[0.64rem] font-extrabold uppercase tracking-wider text-muted">
    {children}
  </p>
)

/** A menu row: leading visual, label (+ optional sublabel), trailing slot. */
const Row = ({
  lead,
  label,
  sub,
  trail,
  active,
  onClick,
}: {
  lead: ReactNode
  label: string
  sub?: string
  trail?: ReactNode
  active?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors ${
      active ? "bg-accent/12 text-accent" : "text-foreground hover:bg-foreground/5"
    }`}
  >
    {lead}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{label}</span>
      {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
    </span>
    {trail}
  </button>
)

const OfficeThumb = ({ o }: { o: ShellOffice }) => (
  <ThumbAvatar
    src={o.thumbnail}
    fallback={o.name.slice(0, 1).toUpperCase()}
    className="size-9 rounded-xl"
  />
)

/** "+ New office" / "+ New organization": an accent action row at the menu's foot. */
const CreateLink = ({ to, label, onClick }: { to: string; label: string; onClick: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-bold text-accent outline-none transition-colors hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-focus"
  >
    <span className="grid size-9 place-items-center">
      <Plus className="size-[18px]" />
    </span>
    {label}
  </Link>
)

const MENU = "rounded-2xl border border-border shadow-overlay"
