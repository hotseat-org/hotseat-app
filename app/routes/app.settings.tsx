import { Outlet } from '@remix-run/react'
import clsx from 'clsx'
import { Container } from '~/components/Container'

export default function Settings() {
  return (
    <Container>
      <div className="flex">
        <h1
          className={clsx(
            'text-3xl',
            'font-extrabold text-transparent',
            'bg-clip-text bg-gradient-to-r',
            'from-blue-700 to-red-400'
          )}
        >
          Your settings
        </h1>
      </div>
      <Outlet />
    </Container>
  )
}
