/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import type { CoreContext } from "../types"
import { reserveDesk } from "./reserve"
import { ReservationError } from "./types"
import { addDays, todayIn } from "~/utils/booking"

const ORGANIZATION = "acme"
const OFFICE = "davion"
const TODAY = todayIn("Europe/Prague")

const desk = (id: string, zone: string) => ({
  id,
  type: "workstation",
  x: 0,
  z: 0,
  rotation: 0,
  zone,
  label: id,
})

/** An office with a Design desk kept for Design until two days before, and one in Marketing. */
const createContext = () => {
  const booked: { userEmail: string; deskId: string; dates: string[] }[] = []
  const repository = {
    profile: {
      find: async ({ userEmail }: { userEmail: string }) => ({ userEmail, role: "USER" }),
    },
    office: {
      find: async () => ({
        slug: OFFICE,
        organizationSlug: ORGANIZATION,
        timezone: "Europe/Prague",
        bookingWindowDays: 14,
        openWeekdays: [1, 2, 3, 4, 5, 6, 7],
        layout: [desk("D-1", "Design"), desk("M-1", "Marketing")],
      }),
    },
    deskRelease: { findMany: async () => [] },
    closedDay: { findMany: async () => [] },
    team: {
      findMany: async () => [
        {
          id: "design",
          name: "Design",
          color: "teal",
          weekdays: [],
          members: ["eva@acme.com"],
          zones: [{ officeSlug: OFFICE, zone: "Design", keepDays: 2 }],
        },
      ],
    },
    reservation: {
      book: async (args: { userEmail: string; deskId: string; dates: string[] }) => {
        booked.push(args)

        return { booked: args.dates, conflicts: [] }
      },
    },
    waitlist: { remove: async () => {} },
  }

  return { reserve: reserveDesk({ mainRepository: repository } as unknown as CoreContext), booked }
}

const book = (userEmail: string, deskId: string, offset: number) =>
  createContext().reserve({
    organizationSlug: ORGANIZATION,
    officeSlug: OFFICE,
    userEmail,
    deskId,
    dates: [addDays(TODAY, offset)],
  })

describe("booking a desk in a zone kept for its team", () => {
  test("someone else can't, until its days before", async () => {
    await expect(book("jan@acme.com", "D-1", 5)).rejects.toBeInstanceOf(ReservationError)
    await expect(book("jan@acme.com", "D-1", 5)).rejects.toThrow(
      "This desk is kept for Design: others can book it from"
    )
    await expect(book("jan@acme.com", "D-1", 2)).resolves.toMatchObject({ conflicts: [] })
  })

  test("its own people can any time; other zones are open", async () => {
    await expect(book("eva@acme.com", "D-1", 5)).resolves.toMatchObject({ conflicts: [] })
    await expect(book("jan@acme.com", "M-1", 5)).resolves.toMatchObject({ conflicts: [] })
  })
})
