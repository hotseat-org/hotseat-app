/**
 * A demo company for screenshots (the product page): Fern & Fox, a small
 * studio with one cosy office, made-up people, zones, permanent desks, four
 * weeks of history and two weeks of bookings ahead. Run it again any time:
 * it deletes the demo company first and starts over.
 *
 *   bun run seed:demo
 *
 * Local databases only: it refuses anything but localhost.
 */
import { SQL } from "bun"
import type { ObjectType, SceneObject } from "~/editor/core"
import { TEMPLATES } from "~/office/templates/templates"

const ORGANIZATION = { slug: "fern-and-fox", name: "Fern & Fox" }
const OFFICE = { slug: "the-burrow", name: "The Burrow" }
const DOMAIN = "fernfox.demo.test"

/** Everyone, the first being whoever the screenshots are taken as. */
const PEOPLE = [
  { name: "Maya Lind", portrait: "women/68", zone: "Design" },
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
  email: `${person.name.toLowerCase().replace(" ", ".")}@${DOMAIN}`,
  avatarUrl: `https://randomuser.me/api/portraits/${person.portrait}.jpg`,
}))

/** Zones across the studio's desks, west to east: their names and desk prefixes. */
const ZONES = [
  { name: "Design", prefix: "D", count: 8 },
  { name: "Engineering", prefix: "E", count: 7 },
  { name: "Support", prefix: "S", count: 5 },
]

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

/** People with a desk of their own (by index in PEOPLE), on the desk of that index. */
const RESIDENTS = [6, 13]

const connectionString = process.env.DATABASE_URL ?? ""

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
  console.error("seed-demo: DATABASE_URL isn't a local database — refusing.")
  process.exit(1)
}

// Bun's own Postgres client: Prisma's engine doesn't load under Bun, and the
// templates need Bun (they read Vite's import.meta.env).
const sql = new SQL(connectionString)

/** The office-local day `offset` days from today, as the database keeps it. */
const getDay = (offset: number) => {
  const today = new Date()
  const day = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + offset))

  return day
}

const getDayText = (day: Date) => day.toISOString().slice(0, 10)

const isWeekend = (day: Date) => day.getUTCDay() === 0 || day.getUTCDay() === 6

/** A steady pseudo-random number in [0, 1) for a seed, so every run looks the same. */
const getNoise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453

  return value - Math.floor(value)
}

const composeLayout = () => {
  const studio = TEMPLATES.find((template) => template.id === "studio")
  if (!studio) throw new Error("seed-demo: no studio template")

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

  for (const person of RESIDENTS) Object.assign(desks[person], { assignee: PEOPLE[person].email })

  return { pieces, desks }
}

const seed = async () => {
  await sql`DELETE FROM "Organization" WHERE slug = ${ORGANIZATION.slug}`
  await sql`DELETE FROM "User" WHERE email LIKE ${`%@${DOMAIN}`}`

  const { pieces, desks } = composeLayout()
  // As text: Bun sends a Date in a form Postgres can't read.
  const now = new Date().toISOString()

  await sql`INSERT INTO "Organization" ${sql({
    ...ORGANIZATION,
    description: "Small design studio. Big on plants.",
    updatedAt: now,
  })}`
  await sql`INSERT INTO "Office" (slug, name, "organizationSlug", layout, timezone, "updatedAt")
    VALUES (${OFFICE.slug}, ${OFFICE.name}, ${ORGANIZATION.slug}, ${JSON.stringify(pieces)}::text::jsonb, 'Europe/Prague', ${now})`

  const users = PEOPLE.map((person) => ({
    email: person.email,
    displayName: person.name,
    avatarUrl: person.avatarUrl,
    updatedAt: now,
  }))
  const profiles = PEOPLE.map((person, index) => ({
    userEmail: person.email,
    organizationSlug: ORGANIZATION.slug,
    role: index === 0 ? "ADMIN" : "USER",
    favoriteOfficeSlug: OFFICE.slug,
    updatedAt: now,
  }))

  await sql`INSERT INTO "User" ${sql(users)}`
  await sql`INSERT INTO "Profile" ${sql(profiles)}`

  const residents = new Set(RESIDENTS.map((person) => desks[person].id))
  const bookable = desks.filter((desk) => !residents.has(desk.id))
  const reservations = []

  // Today, Theo sits at D5 and the standing desk beside it, D6, stays free:
  // just what Maya looks for.
  const [theoDesk, mayaPick] = [desks[4], desks[5]]

  // Eight weeks back (insights compare four with the four before), two ahead.
  // Tuesdays and Wednesdays are busiest; Fridays quiet.
  for (let offset = -56; offset <= 14; offset++) {
    const day = getDay(offset)
    if (isWeekend(day)) continue

    const weekday = day.getUTCDay()
    const busyness = [0, 0.6, 0.85, 0.8, 0.65, 0.35][weekday] * (offset > 7 ? 0.5 : 1)
    const isToday = offset === 0
    const free = bookable.filter((desk) => !isToday || (desk !== theoDesk && desk !== mayaPick))

    for (const [index, person] of PEOPLE.entries()) {
      // The screenshots' person has nothing booked today (so finding a seat shows a pick).
      if (index === 0 && offset === 0) continue
      if (RESIDENTS.includes(index)) continue
      if (!(isToday && index === 1) && getNoise(offset * 31 + index) > busyness) continue

      // Their own zone first, then anywhere.
      const deskIndex = free.findIndex((desk) => desk.zone === person.zone)
      const [desk] =
        isToday && index === 1 ? [theoDesk] : free.splice(deskIndex === -1 ? 0 : deskIndex, 1)
      if (!desk) break

      reservations.push({
        id: crypto.randomUUID(),
        organizationSlug: ORGANIZATION.slug,
        officeSlug: OFFICE.slug,
        userEmail: person.email,
        createdByEmail: person.email,
        deskId: desk.id,
        date: getDayText(day),
      })
    }
  }

  await sql`INSERT INTO "Reservation" ${sql(reservations)}`

  // A resident away now and then: their desk given up for the day.
  const releases = [-48, -34, -20, -13, -6, 1, 3]
    .map(getDay)
    .filter((day) => !isWeekend(day))
    .map((day) => ({
      organizationSlug: ORGANIZATION.slug,
      officeSlug: OFFICE.slug,
      deskId: desks[RESIDENTS[0]].id,
      userEmail: PEOPLE[RESIDENTS[0]].email,
      date: getDayText(day),
    }))

  await sql`INSERT INTO "DeskRelease" ${sql(releases)}`

  // What Maya looks for: Design, near Theo, a standing desk — and a desk she likes.
  const [maya, theo] = PEOPLE
  const scope = {
    organizationSlug: ORGANIZATION.slug,
    officeSlug: OFFICE.slug,
    userEmail: maya.email,
  }
  const rules = [
    { kind: "zone", zone: "Design", strength: "prefer" },
    { kind: "colleague", email: theo.email, strength: "prefer" },
    { kind: "feature", feature: "standing", strength: "prefer" },
  ]

  await sql`INSERT INTO "SeatRules" ("organizationSlug", "officeSlug", "userEmail", rules, "updatedAt")
    VALUES (${scope.organizationSlug}, ${scope.officeSlug}, ${scope.userEmail}, ${JSON.stringify(rules)}::text::jsonb, ${now})`
  await sql`INSERT INTO "FavoriteDesk" ${sql({ ...scope, deskId: desks[2].id })}`

  console.log(
    `seed-demo: ${ORGANIZATION.name}, ${PEOPLE.length} people, ${desks.length} desks, ${reservations.length} bookings — /app/o/${ORGANIZATION.slug}/offices/${OFFICE.slug}`
  )
}

await seed()
await sql.close()
