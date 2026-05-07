import { useStore } from '@xyflow/react'

const DETAIL_ZOOM_THRESHOLD = 0.7

const zoomSelector = (s: { transform: [number, number, number] }) => s.transform[2]

export function useZoomLevel() {
  const zoom = useStore(zoomSelector)
  return {
    zoom,
    showDetail: zoom >= DETAIL_ZOOM_THRESHOLD,
  }
}
