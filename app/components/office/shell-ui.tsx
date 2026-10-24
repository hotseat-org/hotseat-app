import { Avatar } from "@heroui/react"
import type { Translator } from "~/i18n/translate"

export interface ShellMember {
  userEmail: string
  displayName?: string
  avatarUrl?: string
  /** Desk pet model id; unset = derived from the email. */
  pet?: string
  role: string
}

export interface ShellOffice {
  name: string
  slug: string
  thumbnail?: string
  /** Desks, and how many have someone today (the switcher's "5 of 9 in today"). */
  seats?: number
  inToday?: number
}

/** Shared glass-panel styling for floating chrome. */
export const PANEL =
  "pointer-events-auto rounded-2xl border border-border bg-overlay/85 shadow-overlay backdrop-blur-md"

/**
 * Hover for a clickable PANEL. Must be a SOLID colour — a translucent tint (e.g.
 * bg-foreground/5) replaces PANEL's fill and the scene shows through.
 */
export const PANEL_HOVER = "transition-colors hover:bg-surface-secondary"

const AVATAR_COLORS = [
  "#4a6fae",
  "#c9946a",
  "#6f9a58",
  "#c9765a",
  "#8b7fb0",
  "#5f8a86",
  "#b96f6f",
  "#c99a2e",
]

/** "admin" / "user" in the reader's language (shown capitalised). */
export const roleLabel = ({ t }: Translator, role: string) =>
  role === "ADMIN" ? t("admin") : t("user")

export const nameOf = (m: ShellMember) => m.displayName?.trim() || m.userEmail.split("@")[0]

export const initialsOf = (m: ShellMember) => {
  const n = nameOf(m)
  const parts = n.split(/[\s.@_-]+/).filter(Boolean)
  return (
    ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || n.slice(0, 2).toUpperCase()
  )
}

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** A person's avatar colour (behind their initials), stable per email. */
export const colorForEmail = (email: string) => AVATAR_COLORS[hash(email) % AVATAR_COLORS.length]

export const colorOf = (m: ShellMember) => colorForEmail(m.userEmail)

export const MemberAvatar = ({ m, className }: { m: ShellMember; className?: string }) => (
  <Avatar className={className ?? "size-9 rounded-xl"}>
    <Avatar.Image src={m.avatarUrl} />
    <Avatar.Fallback
      className="rounded-[inherit] text-xs font-bold text-white"
      style={{ background: colorOf(m) }}
    >
      {initialsOf(m)}
    </Avatar.Fallback>
  </Avatar>
)

export const ThumbAvatar = ({
  src,
  fallback,
  className,
}: {
  src?: string
  fallback: string
  className?: string
}) => (
  <Avatar className={className ?? "size-9 rounded-lg"}>
    <Avatar.Image src={src} />
    <Avatar.Fallback className="rounded-[inherit] bg-accent/15 text-xs font-bold text-accent">
      {fallback}
    </Avatar.Fallback>
  </Avatar>
)
