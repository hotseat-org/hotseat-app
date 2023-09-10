import { Link, Outlet } from '@remix-run/react'
import { Button } from '~/components/Button'

const Danger = () => {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-bold">Delete this organization</p>
          <div className="text-sm text-foreground-500">
            <p>Once your delete the organization, there is no going back</p>
            <p>
              Organization specific user settings will be deleted as well as all
              the offices, seats and reservations
            </p>
          </div>
        </div>
        <Button variant="flat" color="danger" as={Link} to="delete">
          Delete this organization
        </Button>
      </div>
      <Outlet />
    </div>
  )
}

export default Danger
