import { useEffect, useRef } from 'react'
import {
  drawEcommerceDimensionsOnCanvas,
  type EcommerceCaptureSnapshot,
} from '../../utils/ecommerceExport'

interface EcommerceDimensionLinesProps {
  snapshot: EcommerceCaptureSnapshot | null
  showInternalDimensions: boolean
}

export function EcommerceDimensionLines({
  snapshot,
  showInternalDimensions,
}: EcommerceDimensionLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !snapshot) return
    canvas.width = snapshot.width
    canvas.height = snapshot.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawEcommerceDimensionsOnCanvas(ctx, snapshot, showInternalDimensions)
  }, [snapshot, showInternalDimensions])

  if (!snapshot) return null

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full object-contain"
      aria-label="معاينة صورة المقاسات للمتجر"
    />
  )
}
