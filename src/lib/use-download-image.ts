import { useCallback } from 'react'
import { useReactFlow, getNodesBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'

const PADDING = 80          // image-px around content
const TARGET_SCALE = 2      // crispness; downscaled if image would exceed MAX_DIM
const MAX_DIM = 10000

export function useDownloadImage() {
  const { getNodes } = useReactFlow()

  return useCallback(() => {
    const nodes = getNodes().filter(n => !n.hidden)
    if (nodes.length === 0) return

    const bounds = getNodesBounds(nodes)
    const targetW = bounds.width * TARGET_SCALE + 2 * PADDING
    const targetH = bounds.height * TARGET_SCALE + 2 * PADDING
    const cap = Math.min(1, MAX_DIM / Math.max(targetW, targetH))
    const scale = TARGET_SCALE * cap

    const imgW = Math.ceil(bounds.width * scale + 2 * PADDING)
    const imgH = Math.ceil(bounds.height * scale + 2 * PADDING)
    const tx = PADDING - bounds.x * scale
    const ty = PADDING - bounds.y * scale

    const flowEl = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!flowEl) return

    toPng(flowEl, {
      backgroundColor: '#F9FAFB',
      width: imgW,
      height: imgH,
      style: {
        width: `${imgW}px`,
        height: `${imgH}px`,
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      },
    }).then(dataUrl => {
      const a = document.createElement('a')
      a.setAttribute('download', `kafka-visor-${new Date().toISOString().slice(0, 10)}.png`)
      a.setAttribute('href', dataUrl)
      a.click()
    })
  }, [getNodes])
}
