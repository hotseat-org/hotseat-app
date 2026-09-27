import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

const connectionString = `${process.env.DATABASE_URL}`

export { prisma }

let prisma: PrismaClient

declare global {
  var __prisma: PrismaClient | undefined
  var __prismaClass: typeof PrismaClient | undefined
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
  const adapter = new PrismaPg({ connectionString })
  prisma = new PrismaClient({ adapter })
  prisma.$connect()
} else {
  // After `prisma generate` (a new migration) the dev server reloads the
  // generated client as a new class: drop the cached instance built from the
  // old one, or queries using new columns fail until a restart.
  if (global.__prisma && global.__prismaClass !== PrismaClient) {
    void global.__prisma.$disconnect()
    global.__prisma = undefined
  }
  if (!global.__prisma) {
    global.__prismaClass = PrismaClient
    const adapter = new PrismaPg({ connectionString })
    global.__prisma = new PrismaClient({ adapter })
    global.__prisma.$connect()
  }
  prisma = global.__prisma
}

export default prisma
