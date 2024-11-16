import { useLoaderData } from "@remix-run/react"
import { LoaderFunctionArgs } from "@remix-run/server-runtime"
import { Space } from "node_modules/@smplrspace/smplr-loader/dist/generated/smplr"
import { useEffect, useState } from "react"
import { z } from "zod"
import { SpaceViewer } from "~/components/SpaceView"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

enum DataLayer {
  SELECTED_SEAT = "SelectedSeat",
}

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const slug = z.string().parse(args.params.officeSlug)
  const core = getCore()

  const office = await core.office.get({
    slug,
    organizationSlug: profile.organizationSlug,
  })

  return office
}

const Office = () => {
  const { spaceId } = useLoaderData<typeof loader>()

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
        type: "furniture",
        data: [],
        id: DataLayer.SELECTED_SEAT,
        color: "#2393d4",
      })

      space.enablePickingMode({
        onPick: (data) => {
          setSelectedFurniture(data.furnitureId)
        },
      })
    }
  }, [space])

  return <SpaceViewer spaceId={spaceId} onSpaceReady={(space) => setSpace(space)} />
}

export default Office
