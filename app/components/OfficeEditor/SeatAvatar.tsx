import { Avatar } from "@heroui/react"
import clsx from "clsx"
import { initials, type Person } from "./people"
import { colorForEmail } from "~/components/office/shell-ui"

/**
 * Who sits at a booked desk: their photo (or initials on their colour) in a
 * ring — yours in the accent. The same marker on the plan and in 3D.
 */
export const SeatAvatar = ({
  person,
  email,
  isMine,
  size,
}: {
  person: Person | null
  email: string
  isMine: boolean
  /** Diameter (px). */
  size: number
}) => (
  <Avatar
    className={clsx(
      "shrink-0 rounded-full shadow-overlay ring-[2.5px]",
      isMine ? "ring-accent" : "ring-overlay"
    )}
    style={{ width: size, height: size }}
  >
    <Avatar.Image src={person?.avatarUrl} />
    <Avatar.Fallback
      className="rounded-full font-extrabold text-white"
      style={{ background: colorForEmail(email), fontSize: size * 0.38 }}
    >
      {initials(person?.name ?? email)}
    </Avatar.Fallback>
  </Avatar>
)
