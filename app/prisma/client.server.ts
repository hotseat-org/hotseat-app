import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: [{ level: 'query', emit: 'event' }],
})

prisma.$on('query', (e) => {
  if (e.duration > 50) {
    const red = '\x1b[31m'
    console.log(red, `💾 Slow Prisma query - ${e.duration}ms - ${e.query}`)
  }
})

prisma.$connect()

export default prisma
