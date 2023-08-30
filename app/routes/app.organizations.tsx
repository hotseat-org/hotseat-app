import { Card, CardBody, Link } from '@nextui-org/react'
import { Link as RemixLink, Outlet } from '@remix-run/react'
import { ArrowRight } from 'lucide-react'

export default function Index() {
  return (
    <div className="w-full flex flex-col items-center mt-4">
      <div className="w-[1024px]">
        <Card className="bg-gradient-to-r from-blue-900 via-blue-700 to-red-400 text-blue-300">
          <CardBody>
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <p className="text-4xl">It's lonely here</p>
                <p className="text-slate-300 text-lg">
                  Either wait for someone to invite you to organization or
                  create one yourself!
                </p>
              </div>
              <Link className="text-blue-100" isBlock as={RemixLink} to="new">
                <ArrowRight size={52} />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
      <Outlet />
    </div>
  )
}
