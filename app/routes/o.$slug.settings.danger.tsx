import { Link, Outlet } from '@remix-run/react'
import { Button } from '~/components/Button'

const SettingsInfo = () => {
  return (
    <>
      <Button color="danger" as={Link} to="delete">
        Delete organization
      </Button>
      <Outlet />
    </>
  )
}

export default SettingsInfo
