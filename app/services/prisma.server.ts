import { AsyncLocalStorage } from "node:async_hooks"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

// Workers can't share I/O (DB sockets) between requests, so every request gets
// its own client, bound in `workers/app.ts`. Hyperdrive pools the real
// connections, which keeps a client per request cheap.
const requestPrisma = new AsyncLocalStorage<PrismaClient>()

export const runWithPrisma = <Result>(connectionString: string, callback: () => Result) => {
  const adapter = new PrismaPg({ connectionString })
  return requestPrisma.run(new PrismaClient({ adapter }), callback)
}

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
