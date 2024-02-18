import type { Space } from '@smplrspace/smplr-loader/dist/generated/smplr'
import { memo, useEffect, useState } from 'react'
import { Theme, useTheme } from 'remix-themes'
import { loadSmplr } from '~/utils/smplr'

interface Props {
  isPreview?: boolean
  spaceId?: string
  clientToken?: string
  onSpaceReady?: (space: Space) => void
}

export const SpaceViewer = memo(
  ({
    isPreview,
    spaceId = 'f438671f-9979-42c6-8338-05c0015abb2d',
    clientToken = 'pub_eb760fee77634cdab2fe31146fc371c2',
    onSpaceReady,
  }: Props) => {
    const [space, setSpace] = useState<Space | undefined>()
    const [theme] = useTheme()

    useEffect(() => {
      if (space) {
        space.startViewer({
          preview: isPreview,
          loadingMessage: ' ',
          cameraPlacement: {
            alpha: -0.012,
            beta: 0.34,
            radius: 18.21,
            target: {
              x: 2.41,
              y: 1.5,
              z: 8.35,
            },
          },
          renderOptions: {
            backgroundColor: theme === Theme.DARK ? '#18181B' : undefined,
          },
          onReady: () => {
            onSpaceReady?.(space)
          },
          onError: (error) => console.error('Could not start viewer', error),
        })
      }
    }, [space, isPreview, onSpaceReady, spaceId, theme])

    useEffect(() => {
      loadSmplr()
        .then((smplr) => {
          setSpace(
            new smplr.Space({
              spaceId,
              clientToken,
              containerId: spaceId,
            })
          )
        })
        .catch((error) => console.error(error))
    }, [spaceId, clientToken])

    return (
      <div className={`smplr-wrapper ${isPreview ? `h-56` : `min-h-screen`}`}>
        <div
          id={spaceId}
          className={`smplr-embed [&>*:first-child]:rounded-lg [&>*:first-child]:overflow-hidden ${
            isPreview ? `h-56` : `min-h-screen`
          }`}
        ></div>
      </div>
    )
  },
  (prev, next) => {
    return (
      prev.onSpaceReady === next.onSpaceReady &&
      prev.isPreview === next.isPreview &&
      prev.spaceId === next.spaceId
    )
  }
)

SpaceViewer.displayName = 'SpaceViewer'
