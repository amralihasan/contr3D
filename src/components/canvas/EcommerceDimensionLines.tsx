import { useEffect, useRef } from 'react'
import type { DimensionPlacement } from '../../types/furniture'
import {
  DEFAULT_DIMENSION_PLACEMENT,
  drawEcommerceDimensionsOnCanvas,
  type EcommerceCaptureSnapshot,
} from '../../utils/ecommerceExport'

interface EcommerceDimensionLinesProps {
  snapshot: EcommerceCaptureSnapshot | null
  showInternalDimensions: boolean
  dimensionPlacement?: DimensionPlacement
}

export function EcommerceDimensionLines({
  snapshot,
  showInternalDimensions,
  dimensionPlacement = DEFAULT_DIMENSION_PLACEMENT,
}: EcommerceDimensionLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !snapshot) return
    canvas.width = snapshot.width
    canvas.height = snapshot.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawEcommerceDimensionsOnCanvas(
      ctx,
      snapshot,
      showInternalDimensions,
      dimensionPlacement
    )
  }, [snapshot, showInternalDimensions, dimensionPlacement])

  if (!snapshot) return null

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full object-contain"
      aria-label="معاينة صورة المقاسات للمتجر"
    />
  )
}
