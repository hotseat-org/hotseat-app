import { Popover } from "@heroui/react"
import { Building2, ChevronDown, Plus, Settings } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router"
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
 * project switchers). Offices are switched far more often, so that's one
 * direct menu; orgs sit one level up.
 */
export const WorkspaceSwitcher = ({
  offices,
  isCompact = false,
  className = "absolute left-5 top-5",
}: Props) => {
  const d = useSwitcher(offices)
  const [orgOpen, setOrgOpen] = useState(false)
  const [officeOpen, setOfficeOpen] = useState(false)
  const otherOffices = offices.filter((o) => o.slug !== d.officeSlug)
  const go = (to: string) => {
    setOrgOpen(false)
    setOfficeOpen(false)
    d.navigate(to)
  }
  return (
    <div
      className={`${isCompact ? "pointer-events-auto rounded-2xl" : `${PANEL} p-1.5`} ${className} flex min-w-0 items-center gap-0.5`}
    >
      <Popover isOpen={orgOpen} onOpenChange={setOrgOpen}>
        <Popover.Trigger className="shrink-0">
          <div
            role="button"
            tabIndex={0}
            aria-label="Switch organization"
            className="flex cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
          >
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
          </div>
        </Popover.Trigger>
        <Popover.Content placement="bottom start" offset={10} className={MENU}>
          <Popover.Dialog className="w-72 p-2 outline-none">
            {/* The current org is already on the pill — list only the others. */}
            {d.otherOrgs.length > 0 && (
              <>
                <SectionLabel>Switch organization</SectionLabel>
                <div className="flex flex-col gap-0.5">
                  {d.otherOrgs.map((o) => (
                    <Row
                      key={o.slug}
                      lead={
                        <OrgLogo src={o.thumbnailUrl} name={o.name} className="size-8 rounded-lg" />
                      }
                      label={o.name}
                      sub={`${roleLabel(o)} · ${o.members.totalCount} member${o.members.totalCount === 1 ? "" : "s"}`}
                      onClick={() => go(`/app/o/${o.slug}`)}
                    />
                  ))}
                </div>
              </>
            )}
            <div
              className={`flex flex-col gap-1 ${d.otherOrgs.length > 0 ? "mt-2 border-t border-separator pt-2" : ""}`}
            >
              <Row
                lead={
                  <span className="grid size-8 place-items-center">
                    <Settings className="size-4 text-muted" />
                  </span>
                }
                label="Organization settings"
                onClick={() => {
                  setOrgOpen(false)
                  d.openSettings("org", "general")
                }}
              />
              <CreateLink
                to="?modal=new-organization"
                label="New organization"
                onClick={() => setOrgOpen(false)}
              />
            </div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      <span className="shrink-0 px-0.5 text-lg font-light text-muted/50">/</span>

      <Popover isOpen={officeOpen} onOpenChange={setOfficeOpen}>
        {/* The part that gives way when space is short: its name truncates. */}
        <Popover.Trigger className="min-w-0">
          <div
            role="button"
            tabIndex={0}
            aria-label="Switch office"
            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Building2 className="size-4 shrink-0 text-accent" />
            <span
              className={`min-w-0 truncate text-sm font-semibold text-foreground ${isCompact ? "" : "max-w-36"}`}
            >
              {d.currentOffice?.name ?? (offices.length ? "Select office" : "No offices")}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted" />
          </div>
        </Popover.Trigger>
        <Popover.Content placement="bottom start" offset={10} className={MENU}>
          <Popover.Dialog className="w-64 p-2 outline-none">
            {/* The current office is already on the pill — list only the others. */}
            {otherOffices.length > 0 ? (
              <>
                <SectionLabel>Switch office</SectionLabel>
                <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                  {otherOffices.map((o) => (
                    <Row
                      key={o.slug}
                      lead={<OfficeThumb o={o} />}
                      label={o.name}
                      onClick={() => go(`/app/o/${d.slug}/offices/${o.slug}`)}
                    />
                  ))}
                </div>
              </>
            ) : (
              !d.isAdmin && <p className="px-2 py-2 text-sm text-muted">No other offices.</p>
            )}
            {d.isAdmin && (
              <div className={otherOffices.length > 0 ? "mt-2 border-t border-separator pt-2" : ""}>
                <CreateLink
                  to="?modal=new-office"
                  label="New office"
                  onClick={() => setOfficeOpen(false)}
                />
              </div>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  )
}

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

const roleLabel = (org: Org) => (org.profile.role === Role.ADMIN ? "Admin" : "Member")

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
    className="size-8 rounded-lg"
  />
)

/** Dashed "+" action (New office / New organization). */
const CreateLink = ({ to, label, onClick }: { to: string; label: string; onClick: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-2 rounded-xl border border-dashed border-border px-2.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent/50 hover:bg-accent/5 hover:text-accent"
  >
    <Plus className="size-4" />
    {label}
  </Link>
)

const MENU = "rounded-2xl border border-border shadow-overlay"
