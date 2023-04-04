import { useEffect, useState } from 'react'

import { loadSmplrJs } from '@smplrspace/smplr-loader'
import { desks, rooms } from './data'
import { Space } from '@smplrspace/smplr-loader/dist/generated/smplr'

type Furniture = {
  furnitureId: string
}

export const SpaceViewer = () => {
  const [selectedFurniture, setSelectedFurniture] = useState<
    Furniture | undefined
  >()

  const [space, setSpace] = useState<Space | undefined>()

  useEffect(() => {
    if (space) {
      if (selectedFurniture) {
        space.addDataLayer({
          id: 'selected-furniture',
          type: 'furniture',
          data: [selectedFurniture],
          color: '#3498DB',
        })
      }
    }
  }, [selectedFurniture, space])

  useEffect(() => {
    if (space) {
      space.startViewer({
        compass: false,
        renderOptions: {
          backgroundColor: '#cfd8dc',
        },
        onReady: () => {
          space.addDataLayer({
            id: 'rooms',
            type: 'polygon',
            data: rooms,
            tooltip: (d) => `${d.name} - ${d.available ? 'free' : 'occupied'}`,
            color: (d) => (d.available ? '#3aa655' : '#ff3f34'),
            alpha: 0.7,
            height: 2.9,
          })

          space.addDataLayer({
            id: 'desks',
            type: 'furniture',
            data: desks,
            onClick(dataElement) {
              console.log(dataElement)
            },
            tooltip: (d) => `${d.name} - ${d.available ? 'free' : 'occupied'}`,
            color: (d) => {
              if (d.residentId) return '#2E4053'
              return d.available ? '#50b268' : '#f75e56'
            },
          })

          space.enablePickingMode({
            onPick: (data) => {
              space.removeDataLayer('selected-furniture')
              if (data.furnitureId) {
                return setSelectedFurniture({ furnitureId: data.furnitureId })
              }

              return setSelectedFurniture(undefined)
            },
          })
        },
        onError: (error) => console.error('Could not start viewer', error),
      })
    }
  }, [space])

  useEffect(() => {
    loadSmplrJs('umd')
      .then((smplr) => {
        setSpace(
          new smplr.Space({
            spaceId: 'f438671f-9979-42c6-8338-05c0015abb2d',
            clientToken: 'pub_eb760fee77634cdab2fe31146fc371c2',
            containerId: 'test',
          })
        )
      })
      .catch((error) => console.error(error))
  }, [])

  return (
    <div className="smplr-wrapper">
      <div id="test" className="smplr-embed"></div>
    </div>
  )
}
