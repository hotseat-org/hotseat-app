import { AsyncLocalStorage } from "node:async_hooks"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

// Workers can't share I/O (DB sockets) between requests, so every request gets
// its own client, bound in `workers/app.ts`. Hyperdrive pools the real
// connections, which keeps a client per request cheap.
const requestPrisma = new AsyncLocalStorage<PrismaClient>()

/** A client for the database at `connectionString`. */
export const createPrismaClient = (connectionString: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

/** Run `callback` with `client` as the request's (a Node server shares one, and its pool). */
export const runWithClient = <Result>(client: PrismaClient, callback: () => Result) =>
  requestPrisma.run(client, callback)

/** Run `callback` with a client of its own (Workers: one per request). */
export const runWithPrisma = <Result>(connectionString: string, callback: () => Result) =>
  runWithClient(createPrismaClient(connectionString), callback)

const getRequestPrisma = () => {
  const client = requestPrisma.getStore()
  if (!client) throw new Error("Prisma used outside of a request (runWithPrisma)")
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_, key) => {
    const client = getRequestPrisma()
    const value = Reflect.get(client, key)
    return typeof value === "function" ? value.bind(client) : value
  },
})

export default prisma
