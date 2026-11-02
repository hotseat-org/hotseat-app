import type { ObjectType, SceneObject } from "~/editor/core"
import { TEMPLATES } from "~/office/templates/templates"
import { addDays, isWeekend, type Day } from "~/utils/booking"

/**
 * Fern & Fox, the demo company: a small studio with one cosy office, made-up
 * people, zones, permanent desks, eight weeks of history and two weeks of
 * bookings ahead — composed for a given day, so it always looks lived in.
 * The product page's pictures are taken from it (scripts/seed-demo.ts) and
 * visitors look around their own copy of it (`/demo`).
 */

export const DEMO_DOMAIN = "fernfox.demo.test"

/** The demo's people (shared by every copy): whoever looks around is Maya. */
const PEOPLE = [
  { name: "Theo Park", portrait: "men/32", zone: "Design" },
  { name: "Ivy Chen", portrait: "women/44", zone: "Design" },
  { name: "Oskar Berg", portrait: "men/75", zone: "Design" },
  { name: "Nina Hart", portrait: "women/17", zone: "Design" },
  { name: "Sam Rivera", portrait: "men/46", zone: "Design" },
  { name: "Lena Novak", portrait: "women/90", zone: "Engineering" },
  { name: "Felix Moore", portrait: "men/11", zone: "Engineering" },
  { name: "Ruby Kaur", portrait: "women/63", zone: "Engineering" },
  { name: "Leo Brandt", portrait: "men/52", zone: "Engineering" },
  { name: "Zoe Adams", portrait: "women/26", zone: "Engineering" },
  { name: "Hugo Laine", portrait: "men/86", zone: "Engineering" },
  { name: "Ada Kim", portrait: "women/79", zone: "Engineering" },
  { name: "Max Weber", portrait: "men/22", zone: "Support" },
  { name: "Clara Diaz", portrait: "women/50", zone: "Support" },
  { name: "Finn Walsh", portrait: "men/61", zone: "Support" },
  { name: "Mila Rossi", portrait: "women/33", zone: "Support" },
  { name: "Jonas Vik", portrait: "men/4", zone: "Support" },
  { name: "Elsa Moreau", portrait: "women/12", zone: "Support" },
  { name: "Arlo Grant", portrait: "men/94", zone: "Design" },
].map((person) => ({
  ...person,
  email: `${person.name.toLowerCase().replace(" ", ".")}@${DEMO_DOMAIN}`,
  avatarUrl: `https://randomuser.me/api/portraits/${person.portrait}.jpg`,
}))

const VISITOR = {
  name: "Maya Lind",
  zone: "Design",
  avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
}

/**
 * The studio's teams: one for each zone (the team days its people come in
 * most), and a club across them. The visitor is in Design.
 */
const TEAMS = [
  {
    key: "design",
    name: "Design",
    color: "teal",
    weekdays: [2, 3],
    zone: "Design",
    keepDays: null,
  },
  {
    key: "engineering",
    name: "Engineering",
    color: "denim",
    weekdays: [1, 4],
    zone: "Engineering",
    keepDays: null,
  },
  // Kept for its own people until two days before: support needs to sit together.
  { key: "support", name: "Support", color: "coral", weekdays: [], zone: "Support", keepDays: 2 },
  { key: "plants", name: "Plant club", color: "sage", weekdays: [5], zone: null, keepDays: null },
] as const

/** Plant club's people (by index in PEOPLE): someone from every team. */
const PLANT_CLUB = [1, 6, 13, 17]

/** Zones across the studio's desks, west to east: their names and desk prefixes. */
const ZONES = [
  { name: "Design", prefix: "D", count: 8 },
  { name: "Engineering", prefix: "E", count: 7 },
  { name: "Support", prefix: "S", count: 5 },
]

/** People with a desk of their own (by index in PEOPLE), on the desk of their index + 1. */
const RESIDENTS = [5, 12]

/** Extra cosiness on top of the studio template: plants, shelves and lamps along the walls. */
const DECOR = [
  { type: "plant", x: 0.25, z: 0.25 },
  { type: "plant", x: 0.25, z: 4 },
  { type: "plant", x: 0.25, z: 7.5 },
  { type: "plant", x: 13.6, z: 7.6 },
  { type: "plant", x: 12.75, z: 8.5 },
  { type: "plant", x: 19.6, z: 11.75 },
  { type: "bookshelf", x: 3.5, z: 0.25 },
  { type: "bookshelf", x: 6.5, z: 0.25 },
  { type: "bookshelf", x: 9.5, z: 0.25 },
  { type: "floorLamp", x: 9, z: 11.6 },
  { type: "floorLamp", x: 12.25, z: 11.6 },
  { type: "floorLamp", x: 13.6, z: 0.4 },
  { type: "floorLamp", x: 13.6, z: 4.6 },
].map(
  (piece, index): SceneObject => ({
    ...piece,
    type: piece.type as ObjectType,
    id: `demo-${index}`,
    rotation: 0,
  })
)

export interface DemoPerson {
  email: string
  displayName: string
  avatarUrl: string
  role: "ADMIN" | "USER"
}

export interface DemoCompany {
  organization: { slug: string; name: string; description: string }
  office: { slug: string; name: string; timezone: string; layout: SceneObject[] }
  /** Everyone in it, the visitor first. */
  people: DemoPerson[]
  reservations: { userEmail: string; deskId: string; date: Day }[]
  releases: { userEmail: string; deskId: string; date: Day }[]
  seatRules: { userEmail: string; rules: object[] }
  favorite: { userEmail: string; deskId: string }
  teams: {
    id: string
    name: string
    color: string
    weekdays: number[]
    members: string[]
    zone: string | null
    keepDays: number | null
  }[]
}

/** A steady pseudo-random number in [0, 1) for a seed, so every copy looks the same. */
const getNoise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453

  return value - Math.floor(value)
}

const composeLayout = () => {
  const studio = TEMPLATES.find((template) => template.id === "studio")
  if (!studio) throw new Error("No studio template for the demo")

  const pieces = [...studio.build(), ...DECOR]
  const desks = pieces
    .filter((piece) => piece.type === "workstation")
    .sort((first, second) => first.x - second.x || first.z - second.z)

  let index = 0

  for (const zone of ZONES) {
    for (let number = 1; number <= zone.count; number++) {
      const desk = desks[index++]
      if (!desk) break

      Object.assign(desk, { zone: zone.name, label: `${zone.prefix}${number}` })
      if (number % 3 === 0) Object.assign(desk, { features: ["standing"] })
    }
  }

  for (const person of RESIDENTS)
    Object.assign(desks[person + 1], { assignee: PEOPLE[person].email })

  return { pieces, desks }
}

/**
 * The demo company as it is on `today`, for a visitor (`visitorEmail`), in an
 * organization at `organizationSlug`.
 */
export const composeDemoCompany = ({
  today,
  organizationSlug,
  visitorEmail,
}: {
  today: Day
  organizationSlug: string
  visitorEmail: string
}): DemoCompany => {
  const { pieces, desks } = composeLayout()
  const visitor: DemoPerson = {
    email: visitorEmail,
    displayName: VISITOR.name,
    avatarUrl: VISITOR.avatarUrl,
    role: "ADMIN",
  }
  const people: DemoPerson[] = [
    visitor,
    ...PEOPLE.map((person) => ({
      email: person.email,
      displayName: person.name,
      avatarUrl: person.avatarUrl,
      role: "USER" as const,
    })),
  ]

  // Each team: its zone's people (the visitor in Design), or the club's.
  const teams = TEAMS.map((team) => ({
    id: `${organizationSlug}-${team.key}`,
    name: team.name,
    color: team.color,
    weekdays: [...team.weekdays],
    zone: team.zone,
    keepDays: team.keepDays,
    members: team.zone
      ? [
          ...(team.zone === VISITOR.zone ? [visitorEmail] : []),
          ...PEOPLE.filter((person) => person.zone === team.zone).map((person) => person.email),
        ]
      : PLANT_CLUB.map((index) => PEOPLE[index].email),
  }))
  const teamDaysOf = (zone: string) =>
    TEAMS.find((team) => team.zone === zone)?.weekdays ?? ([] as readonly number[])

  const residentDesks = new Set(RESIDENTS.map((person) => desks[person + 1].id))
  const bookable = desks.filter((desk) => !residentDesks.has(desk.id))
  const residents = new Set(RESIDENTS.map((person) => PEOPLE[person].email))

  // Today, Theo sits at D5 and the standing desk beside it, D6, stays free:
  // just what the visitor looks for.
  const [theo] = PEOPLE
  const [theoDesk, visitorPick] = [desks[4], desks[5]]
  const reservations: DemoCompany["reservations"] = []

  // Eight weeks back (insights compare four with the four before), two ahead.
  // Tuesdays and Wednesdays are busiest; Fridays quiet.
  for (let offset = -56; offset <= 14; offset++) {
    const date = addDays(today, offset)
    if (isWeekend(date)) continue

    const isToday = offset === 0
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    const busyness = [0, 0.6, 0.85, 0.8, 0.65, 0.35][weekday] * (offset > 7 ? 0.5 : 1)
    const free = bookable.filter((desk) => !isToday || (desk !== theoDesk && desk !== visitorPick))

    for (const [index, person] of [VISITOR, ...PEOPLE].entries()) {
      const email = index === 0 ? visitorEmail : PEOPLE[index - 1].email
      const isTheoToday = isToday && email === theo.email

      // The visitor has nothing booked today (so finding a seat shows a pick).
      if (index === 0 && isToday) continue
      if (residents.has(email)) continue
      // On their team's days, most of a team comes in.
      const isTeamDay = (teamDaysOf(person.zone) as readonly number[]).includes(weekday)
      const chance = isTeamDay ? Math.min(busyness + 0.25, 0.95) : busyness
      if (!isTheoToday && getNoise(offset * 31 + index) > chance) continue

      // Their own zone first, then anywhere.
      const deskIndex = free.findIndex((desk) => desk.zone === person.zone)
      const [desk] = isTheoToday ? [theoDesk] : free.splice(deskIndex === -1 ? 0 : deskIndex, 1)
      if (!desk) break

      reservations.push({ userEmail: email, deskId: desk.id, date })
    }
  }

  // A resident away now and then: their desk given up for the day.
  const [firstResident] = RESIDENTS
  const releases = [-48, -34, -20, -13, -6, 1, 3]
    .map((offset) => addDays(today, offset))
    .filter((date) => !isWeekend(date))
    .map((date) => ({
      userEmail: PEOPLE[firstResident].email,
      deskId: desks[firstResident + 1].id,
      date,
    }))

  return {
    organization: {
      slug: organizationSlug,
      name: "Fern & Fox",
      description: "Small design studio. Big on plants.",
    },
    office: { slug: "the-burrow", name: "The Burrow", timezone: "Europe/Prague", layout: pieces },
    people,
    reservations,
    releases,
    // What the visitor looks for: with their team, near Theo, a standing desk — and a desk they like.
    seatRules: {
      userEmail: visitorEmail,
      rules: [
        { kind: "team", teamId: teams[0].id, strength: "prefer" },
        { kind: "colleague", email: theo.email, strength: "prefer" },
        { kind: "feature", feature: "standing", strength: "prefer" },
      ],
    },
    favorite: { userEmail: visitorEmail, deskId: desks[2].id },
    teams,
  }
}
