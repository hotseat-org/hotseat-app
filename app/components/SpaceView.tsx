import { useEffect } from 'react'

import { loadSmplrJs } from '@smplrspace/smplr-loader'
import { desks, rooms } from './data'

export const SpaceViewer = () => {
  useEffect(() => {
    loadSmplrJs('umd')
      .then((smplr) => {
        const space = new smplr.Space({
          spaceId: 'f438671f-9979-42c6-8338-05c0015abb2d',
          clientToken: 'pub_eb760fee77634cdab2fe31146fc371c2',
          containerId: 'test',
        })
        space.startViewer({
          preview: false,
          compass: false,
          onReady: () => {
            space.addDataLayer({
              id: 'rooms',
              type: 'polygon',
              data: rooms,
              tooltip: (d) =>
                `${d.name} - ${d.available ? 'free' : 'occupied'}`,
              color: (d) => (d.available ? '#3aa655' : '#ff3f34'),
              alpha: 0.7,
              height: 2.9,
            })

            space.addDataLayer({
              id: 'desks',
              type: 'furniture',
              data: desks,
              tooltip: (d) =>
                `${d.name} - ${d.available ? 'free' : 'occupied'}`,
              color: (d) => (d.available ? '#50b268' : '#f75e56'),
            })
          },
          onError: (error) => console.error('Could not start viewer', error),
        })
      })
      .catch((error) => console.error(error))
  }, [])

  return (
    <div className="smplr-wrapper">
      <div id="test" className="smplr-embed"></div>
    </div>
  )
}
