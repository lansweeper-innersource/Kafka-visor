import { useCallback } from 'react'
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'

const IMAGE_WIDTH = 4096
const IMAGE_HEIGHT = 3072
const PADDING = 0.1

export function useDownloadImage() {
  const { getNodes } = useReactFlow()

  return useCallback(() => {
    const nodes = getNodes().filter(n => !n.hidden)
    if (nodes.length === 0) return

    const bounds = getNodesBounds(nodes)
    const viewport = getViewportForBounds(
      bounds,
      IMAGE_WIDTH,
      IMAGE_HEIGHT,
      0.5,
      2,
      PADDING,
    )

    const flowEl = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!flowEl) return

    toPng(flowEl, {
      backgroundColor: '#F9FAFB',
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then(dataUrl => {
      const a = document.createElement('a')
      a.setAttribute('download', `kafka-visor-${new Date().toISOString().slice(0, 10)}.png`)
      a.setAttribute('href', dataUrl)
      a.click()
    })
  }, [getNodes])
}
