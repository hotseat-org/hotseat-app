/// <reference types="bun" />
import { beforeEach, describe, expect, test } from "bun:test"
import type { CoreContext } from "../types"
import { TeamError, saveTeam } from "."
import type { Team } from "~/utils/teams"

const ORGANIZATION = "acme"
const ADMIN = "ada@acme.com"

/** The repository's team calls, kept in memory; members and offices as given. */
const createContext = ({ teams = [] as Team[], members = [ADMIN, "eva@acme.com"] } = {}) => {
  const saved: (Omit<Team, "id"> & { id?: string })[] = []
  const repository = {
    profile: {
      find: async ({ userEmail }: { userEmail: string }) =>
        members.includes(userEmail)
          ? { userEmail, role: userEmail === ADMIN ? "ADMIN" : "USER" }
          : null,
      findMany: async () => ({ data: members.map((userEmail) => ({ userEmail })) }),
    },
    office: {
      findMany: async () => ({ data: [{ slug: "davion" }] }),
    },
    team: {
      findMany: async () => teams,
      save: async (team: Omit<Team, "id"> & { id?: string }) => {
        saved.push(team)

        return team.id ?? "new-team"
      },
    },
  }

  return { context: { mainRepository: repository } as unknown as CoreContext, saved }
}

const NEW_TEAM = {
  name: "  Design   studio ",
  color: "teal" as const,
  weekdays: [4, 2, 9],
  members: ["eva@acme.com", "stranger@elsewhere.com", "eva@acme.com"],
  zones: [
    { officeSlug: "davion", zone: "Design corner", keepDays: 2 },
    { officeSlug: "gone", zone: "Old", keepDays: null },
  ],
}

describe("saving a team", () => {
  let setup: ReturnType<typeof createContext>

  beforeEach(() => {
    setup = createContext()
  })

  test("keeps only what can be: members, offices, weekdays; its name tidied", async () => {
    await saveTeam(setup.context)({
      organizationSlug: ORGANIZATION,
      userEmail: ADMIN,
      team: NEW_TEAM,
    })

    expect(setup.saved[0]).toMatchObject({
      name: "Design studio",
      weekdays: [2, 4],
      members: ["eva@acme.com"],
      zones: [{ officeSlug: "davion", zone: "Design corner", keepDays: 2 }],
    })
  })

  test("a kept zone's days are one of the choices, else not kept", async () => {
    const team = { ...NEW_TEAM, zones: [{ officeSlug: "davion", zone: "Design", keepDays: 4 }] }
    await saveTeam(setup.context)({ organizationSlug: ORGANIZATION, userEmail: ADMIN, team })

    expect(setup.saved[0].zones[0].keepDays).toBeNull()
  })

  test("is for admins only", async () => {
    const saving = saveTeam(setup.context)({
      organizationSlug: ORGANIZATION,
      userEmail: "eva@acme.com",
      team: NEW_TEAM,
    })

    await expect(saving).rejects.toThrow("Forbidden")
  })

  test("needs a name, and one no other team has (whatever its letters' case)", async () => {
    const existing: Team = { ...NEW_TEAM, id: "t1", name: "Design studio", color: "teal" }
    const { context } = createContext({ teams: [existing] })
    const save = saveTeam(context)

    await expect(
      save({ organizationSlug: ORGANIZATION, userEmail: ADMIN, team: { ...NEW_TEAM, name: "  " } })
    ).rejects.toBeInstanceOf(TeamError)
    await expect(
      save({
        organizationSlug: ORGANIZATION,
        userEmail: ADMIN,
        team: { ...NEW_TEAM, name: "design STUDIO" },
      })
    ).rejects.toThrow("There's a team with this name already.")
    // Saving the team itself under its own name is fine.
    await expect(
      save({ organizationSlug: ORGANIZATION, userEmail: ADMIN, team: { ...NEW_TEAM, id: "t1" } })
    ).resolves.toBe("t1")
  })

  test("an unknown colour becomes slate", async () => {
    const team = { ...NEW_TEAM, color: "neon" as unknown as "teal" }
    await saveTeam(setup.context)({ organizationSlug: ORGANIZATION, userEmail: ADMIN, team })

    expect(setup.saved[0].color).toBe("slate")
  })
})
