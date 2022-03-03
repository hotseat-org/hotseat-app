import prisma from '~/prisma/client.server'
import { exclude } from '~/utils/exclude'
import { dataLoader } from '~/utils/remix'

export const { loader, useData } = dataLoader(async () => {
  const allUsers = await prisma.user.findMany()
  return allUsers.map((user) => exclude(user, 'PK'))
})

export default function Index() {
  const users = useData()
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Welcome to Remix</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
