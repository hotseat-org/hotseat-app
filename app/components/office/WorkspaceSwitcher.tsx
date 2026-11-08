import { Popover, Tooltip } from "@heroui/react"
import { Building2, ChevronDown, Plus, Settings, Star } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link, PrefetchPageLinks, useFetcher, useNavigate, useParams } from "react-router"
import { MOBILE_CHROME } from "./mobile"
import { PANEL, ThumbAvatar, type ShellOffice } from "./shell-ui"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { useOrganizationContext } from "~/utils/hooks/useProfileData"
import { useProfile } from "~/utils/remix"
import { useIsSelfHosted } from "~/edition/edition"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"

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
  const { t } = d.i18n
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
        {d.currentOffice?.name ?? (offices.length ? t("Select office") : t("No offices"))}
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
          aria-label={t("Switch organization")}
          aria-expanded={open === "org"}
          onClick={() => toggle("org")}
          className={`${TRIGGER} shrink-0 ${open === "org" ? "bg-surface-secondary" : ""}`}
        >
          {orgTrigger}
        </button>
        <span className="shrink-0 px-0.5 text-lg font-light text-muted/50">/</span>
        <button
          type="button"
          aria-label={t("Switch office")}
          aria-expanded={open === "office"}
          onClick={() => toggle("office")}
          className={`${TRIGGER} min-w-0 ${open === "office" ? "bg-surface-secondary" : ""}`}
        >
          {officeTrigger}
        </button>
        {open && (
          <DropPanel label={open === "org" ? t("Organizations") : t("Offices")} onClose={close}>
            {open === "org" ? orgMenu : officeMenu}
          </DropPanel>
        )}
      </div>
    )

  return (
    <div className={`${PANEL} p-1.5 ${className} flex min-w-0 items-center gap-0.5`}>
      <Popover isOpen={open === "org"} onOpenChange={(isOpen) => setOpen(isOpen ? "org" : null)}>
        {/* The trigger is the button itself: one tab stop, no button inside a button. */}
        <Popover.Trigger aria-label={t("Switch organization")} className={`${TRIGGER} shrink-0`}>
          {orgTrigger}
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
        <Popover.Trigger aria-label={t("Switch office")} className={`${TRIGGER} min-w-0`}>
          {officeTrigger}
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
      sub={d.currentOrg && orgDetail(d.i18n, d.currentOrg)}
      settingsLabel={d.i18n.t("Organization settings")}
      // Settings are an admin's: members don't get the gear.
      onSettings={
        d.isAdmin
          ? () => {
              onClose()
              d.openSettings("org")
            }
          : undefined
      }
    />
    {d.otherOrgs.length > 0 && (
      <>
        <SectionLabel>{d.i18n.t("Other organizations")}</SectionLabel>
        {d.otherOrgs.map((o) => (
          <Row
            key={o.slug}
            lead={<OrgLogo src={o.thumbnailUrl} name={o.name} className="size-9 rounded-xl" />}
            label={o.name}
            sub={orgDetail(d.i18n, o)}
            prefetchPath={`/app/o/${o.slug}`}
            onClick={() => onGo(`/app/o/${o.slug}`)}
          />
        ))}
      </>
    )}
    {d.canCreateOrganization && (
      <>
        <Divider />
        <CreateLink
          to="?modal=new-organization"
          label={d.i18n.t("New organization")}
          onClick={onClose}
        />
      </>
    )}
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
  const { t } = d.i18n
  const favorite = useFavoriteOffice(d.slug)
  return (
    <>
      {d.currentOffice && (
        <CurrentHeader
          lead={<OfficeThumb o={d.currentOffice} />}
          label={d.currentOffice.name}
          sub={occupancyDetail(d.i18n, d.currentOffice)}
          action={
            <FavoriteButton
              isFavorite={favorite.slug === d.currentOffice.slug}
              onToggle={() =>
                favorite.set(favorite.slug === d.officeSlug ? null : (d.officeSlug ?? null))
              }
            />
          }
          settingsLabel={t("Office settings")}
          onSettings={
            d.isAdmin
              ? () => {
                  onClose()
                  d.openSettings("office")
                }
              : undefined
          }
        />
      )}
      {otherOffices.length > 0 ? (
        <>
          <SectionLabel>{d.currentOffice ? t("Other offices") : t("Offices")}</SectionLabel>
          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {otherOffices.map((o) => (
              <Row
                key={o.slug}
                lead={<OfficeThumb o={o} />}
                label={o.name}
                sub={occupancyDetail(d.i18n, o)}
                trail={
                  favorite.slug === o.slug && (
                    <Star
                      aria-label={t("Favourite office")}
                      className="mr-1 size-4 shrink-0 fill-accent text-accent"
                    />
                  )
                }
                prefetchPath={`/app/o/${d.slug}/offices/${o.slug}`}
                onClick={() => onGo(`/app/o/${d.slug}/offices/${o.slug}`)}
              />
            ))}
          </div>
        </>
      ) : (
        !d.isAdmin && <p className="px-2 py-2 text-sm text-muted">{t("No other offices.")}</p>
      )}
      {d.isAdmin && (
        <>
          {/* Only between offices and the action — not above it alone. */}
          {(d.currentOffice || otherOffices.length > 0) && <Divider />}
          <CreateLink to="?modal=new-office" label={t("New office")} onClick={onClose} />
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
  const { t } = useI18n()
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
        aria-label={t("Close")}
        tabIndex={-1}
        onClick={onClose}
        className="pointer-events-auto absolute inset-0 bg-scrim"
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
  const i18n = useI18n()
  // One company's own installation: no other organizations to make.
  const canCreateOrganization = !useIsSelfHosted()
  return {
    i18n,
    canCreateOrganization,
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
const orgDetail = ({ t, tn }: Translator, org: Org) =>
  `${org.role === Role.ADMIN ? t("Admin") : t("Member")} · ${tn(org.memberCount, "{n} member", "{n} members")}`

/** "5 of 9 in today", "Nobody in today", "No desks yet". */
const occupancyDetail = ({ t }: Translator, o: ShellOffice) => {
  if (o.seats === undefined || o.inToday === undefined) return undefined
  if (o.seats === 0) return t("No desks yet")
  if (o.inToday === 0) return t("Nobody in today")
  return t("{in} of {total} in today", { in: o.inToday, total: o.seats })
}

/** The current org/office atop its menu: highlighted, with a gear for its settings (admins). */
const CurrentHeader = ({
  lead,
  label,
  sub,
  action,
  settingsLabel,
  onSettings,
}: {
  lead: ReactNode
  label: string
  sub?: string
  /** A button before the gear (the office's favourite star). */
  action?: ReactNode
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
    {action}
    {onSettings && (
      <HeaderButton label={settingsLabel} onClick={onSettings}>
        <Settings className="size-[18px]" />
      </HeaderButton>
    )}
  </div>
)

/** An icon button on the current org/office header, with its label as a tooltip. */
const HeaderButton = ({
  label,
  isPressed,
  onClick,
  children,
}: {
  label: string
  isPressed?: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <Tooltip delay={350}>
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isPressed}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-muted outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </button>
    <Tooltip.Content
      placement="right"
      className="rounded-md border border-border bg-overlay px-2 py-1 text-xs text-foreground shadow-overlay"
    >
      {label}
    </Tooltip.Content>
  </Tooltip>
)

/**
 * Your favourite office in this organization — where the app opens for you —
 * shown at once while it saves.
 */
const useFavoriteOffice = (organizationSlug?: string) => {
  const fetcher = useFetcher()
  const saved = useProfile().favoriteOfficeSlug ?? null
  const pending = fetcher.formData?.get("officeSlug")
  return {
    slug: typeof pending === "string" ? pending || null : saved,
    set: (officeSlug: string | null) =>
      fetcher.submit(
        { officeSlug: officeSlug ?? "" },
        { method: "post", action: `/api/favorite-office/${organizationSlug}` }
      ),
  }
}

/** The star on the current office: make it the one the app opens to. */
const FavoriteButton = ({
  isFavorite,
  onToggle,
}: {
  isFavorite: boolean
  onToggle: () => void
}) => {
  const { t } = useI18n()
  return (
    <HeaderButton
      label={
        isFavorite ? t("Your favourite office: the app opens here") : t("Always open the app here")
      }
      isPressed={isFavorite}
      onClick={onToggle}
    >
      <Star className={`size-[18px] ${isFavorite ? "fill-accent text-accent" : ""}`} />
    </HeaderButton>
  )
}

const Divider = () => <div className="mx-1 my-1.5 h-px bg-separator" />

const OrgLogo = ({ src, name, className }: { src?: string; name: string; className: string }) => (
  <ThumbAvatar src={src} fallback={name.slice(0, 1).toUpperCase()} className={className} />
)

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-2 pb-1 pt-2 text-[13px] font-black text-muted">{children}</p>
)

/**
 * A menu row: leading visual, label (+ optional sublabel), trailing slot.
 * Going to `prefetchPath`, the page's code and data start loading as soon
 * as it's hovered, focused or touched — often ready by the click.
 */
const Row = ({
  lead,
  label,
  sub,
  trail,
  active,
  prefetchPath,
  onClick,
}: {
  lead: ReactNode
  label: string
  sub?: string
  trail?: ReactNode
  active?: boolean
  prefetchPath?: string
  onClick: () => void
}) => {
  const [isIntended, setIsIntended] = useState(false)
  const intend = () => setIsIntended(true)

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={intend}
      onFocus={intend}
      onTouchStart={intend}
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
      {prefetchPath && isIntended && <PrefetchPageLinks page={prefetchPath} />}
    </button>
  )
}

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
