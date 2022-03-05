import prisma from '~/prisma/client.server'
import { exclude } from '~/utils/exclude'
import { dataLoader } from '~/utils/remix'

export const { loader, useData } = dataLoader(async () => {
  const allUsers = await prisma.user.findMany()
  return allUsers.map((user) => exclude(user, 'PK'))
})

export const handle = {
  foo: 1,
}

export default function Index() {
  const users = useData()

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.4' }}>
      <h1>Welcome to Remix</h1>
      <ul>
        {users.map((user) => (
          <li
            className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4"
            key={user.id}
          >
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
