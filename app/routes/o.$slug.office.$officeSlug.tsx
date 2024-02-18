import { useLoaderData } from '@remix-run/react'
import { LoaderFunctionArgs, json } from '@remix-run/server-runtime'
import { Space } from '@smplrspace/smplr-loader/dist/generated/smplr'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Button } from '~/components/Button'
import { Container } from '~/components/Container'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireProfile } from '~/utils/loader-helpers/requireProfile'

enum DataLayer {
  SELECTED_SEAT = 'SelectedSeat',
}

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const slug = z.string().parse(args.params.officeSlug)
  const core = getCore()

  const office = await core.office.get({
    slug,
    organizationSlug: profile.organizationSlug,
  })

  return json(office)
}

const Office = () => {
  const { name, spaceUrl } = useLoaderData<typeof loader>()

  const [space, setSpace] = useState<Space>()
  const [selectedFurniture, setSelectedFurniture] = useState<string>()

  useEffect(() => {
    const dl = space?.getDataLayer(DataLayer.SELECTED_SEAT)
    if (dl) {
      dl.update({
        data: selectedFurniture
          ? [
              {
                furnitureId: selectedFurniture,
              },
            ]
          : [],
      })
    }
  }, [selectedFurniture, space])

  useEffect(() => {
    if (space) {
      space.addDataLayer({
        type: 'furniture',
        data: [],
        id: DataLayer.SELECTED_SEAT,
        color: '#2393d4',
      })

      space.enablePickingMode({
        onPick: (data) => {
          setSelectedFurniture(data.furnitureId)
        },
      })
    }
  }, [space])

  return (
    <div>
      <Container isWide>
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-extrabold">{name}</h1>
          <div>
            {selectedFurniture && (
              <Button variant="flat" color="primary">
                Create a seat
              </Button>
            )}
          </div>
        </div>
        <SpaceViewer
          spaceId={spaceUrl}
          onSpaceReady={(space) => setSpace(space)}
        />
      </Container>
    </div>
  )
}

export default Office
