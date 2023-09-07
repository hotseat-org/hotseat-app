import { Divider, Input, Textarea } from '@nextui-org/react'
import { useRouteLoaderData } from '@remix-run/react'
import type { loader } from './o.$slug'

const SettingsInfo = () => {
  const organization = useRouteLoaderData<typeof loader>('routes/o.$slug')

  return (
    <div className="flex flex-col gap-6 w-[825px]">
      <div className="flex justify-between ">
        <div className="w-96">
          <p className="font-bold">Name</p>
          <p className="text-slate-400">
            Changing name will also change the URL
          </p>
        </div>
        <div className="w-72 flex flex-col gap-2">
          <Input isRequired name="name" defaultValue={organization?.name} />
          <Input
            type="url"
            disabled
            startContent={
              <div className="pointer-events-none flex items-center">
                <span className="text-default-400 text-small">
                  https://localhost/o/
                </span>
              </div>
            }
            isRequired
            name="name"
            defaultValue={organization?.slug}
          />
        </div>
      </div>
      <Divider />
      <div className="flex justify-between">
        <div className="w-96">
          <p className="font-bold">Description</p>
        </div>
        <div className="w-72 flex flex-col gap-2">
          <Textarea />
        </div>
      </div>
    </div>
  )
}

export default SettingsInfo
