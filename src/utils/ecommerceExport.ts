import * as THREE from 'three'
import { isLegOrBaseRole, type CameraPreset, type FurniturePanel } from '../types/furniture'
import { computeOverallDimensions } from './dimensions'
import { getPanelWorldBox, roundTo } from './snapping'

export type EcommerceCameraAngle = 'current' | CameraPreset

export interface EcommerceCaptureOptions {
  whitePiece: boolean
  cameraAngle: EcommerceCameraAngle
  width?: number
  height?: number
}

export interface EcommerceCaptureSnapshot {
  baseCanvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  panels: FurniturePanel[]
  width: number
  height: number
}

type EcommerceCapturer = (
  options: EcommerceCaptureOptions
) => Promise<EcommerceCaptureSnapshot | null>

let activeEcommerceCapturer: EcommerceCapturer | null = null

export function registerEcommerceCapturer(capturer: EcommerceCapturer | null): void {
  activeEcommerceCapturer = capturer
}

export async function captureEcommerceStudio(
  options: EcommerceCaptureOptions
): Promise<EcommerceCaptureSnapshot | null> {
  if (!activeEcommerceCapturer) return null
  return activeEcommerceCapturer(options)
}

interface Point2D {
  x: number
  y: number
  ndcZ: number
}

function projectPoint(
  x: number,
  y: number,
  z: number,
  camera: THREE.Camera,
  width: number,
  height: number
): Point2D {
  const vec = new THREE.Vector3(x, y, z).project(camera)
  return {
    x: (vec.x * 0.5 + 0.5) * width,
    y: (-vec.y * 0.5 + 0.5) * height,
    ndcZ: vec.z,
  }
}

export function formatEnCm(value: number): string {
  const rounded = roundTo(value, 1)
  return `${rounded} cm`
}

function drawEndTickOrArrow(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  dirX: number,
  dirY: number,
  size: number,
  color: string
) {
  const angle = Math.atan2(dirY, dirX)
  const spread = 0.32
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(
    tipX - size * Math.cos(angle - spread),
    tipY - size * Math.sin(angle - spread)
  )
  ctx.lineTo(
    tipX - size * Math.cos(angle + spread),
    tipY - size * Math.sin(angle + spread)
  )
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

function chooseOutwardNormal(
  p1: Point2D,
  p2: Point2D,
  boxCenter2D: { x: number; y: number }
): { nx: number; ny: number } {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.hypot(dx, dy) || 1
  const nx1 = -dy / len
  const ny1 = dx / len
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2
  const dot = (midX - boxCenter2D.x) * nx1 + (midY - boxCenter2D.y) * ny1
  return dot >= 0 ? { nx: nx1, ny: ny1 } : { nx: -nx1, ny: -ny1 }
}

interface DrawCleanDimensionOptions {
  ctx: CanvasRenderingContext2D
  p1: Point2D
  p2: Point2D
  outwardNormalX: number
  outwardNormalY: number
  offsetPx: number
  label: string
  scale: number
  canvasW: number
  canvasH: number
  lineColor?: string
  extColor?: string
  fontSizePx?: number
  labelSide?: 'center' | 'outside'
  dashedExt?: boolean
  softHalo?: boolean
}

function drawCleanDimensionLine({
  ctx,
  p1,
  p2,
  outwardNormalX,
  outwardNormalY,
  offsetPx,
  label,
  scale,
  canvasW,
  canvasH,
  lineColor = '#1f2937',
  extColor = '#94a3b8',
  fontSizePx = 15,
  labelSide = 'outside',
  dashedExt = false,
  softHalo = false,
}: DrawCleanDimensionOptions) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const segLen = Math.hypot(dx, dy)
  if (segLen < 28 * scale) return

  const ux = dx / segLen
  const uy = dy / segLen

  const pad = 34 * scale
  const rawD1x = p1.x + outwardNormalX * offsetPx
  const rawD1y = p1.y + outwardNormalY * offsetPx
  const rawD2x = p2.x + outwardNormalX * offsetPx
  const rawD2y = p2.y + outwardNormalY * offsetPx

  const d1x = Math.min(canvasW - pad, Math.max(pad, rawD1x))
  const d1y = Math.min(canvasH - pad, Math.max(pad, rawD1y))
  const d2x = Math.min(canvasW - pad, Math.max(pad, rawD2x))
  const d2y = Math.min(canvasH - pad, Math.max(pad, rawD2y))

  const extGap = 8 * scale
  const extOvershoot = 6 * scale

  // خطوط امتداد رفيعة بدون تشتيت
  if (Math.abs(offsetPx) > 4) {
    ctx.save()
    ctx.strokeStyle = extColor
    ctx.lineWidth = Math.max(0.9, 1.05 * scale)
    if (dashedExt) {
      ctx.setLineDash([4 * scale, 3 * scale])
    }

    const drawExt = (ax: number, ay: number, bx: number, by: number) => {
      const ex = bx - ax
      const ey = by - ay
      const elen = Math.hypot(ex, ey)
      if (elen < extGap + 4) return
      const enx = ex / elen
      const eny = ey / elen
      ctx.beginPath()
      ctx.moveTo(ax + enx * extGap, ay + eny * extGap)
      ctx.lineTo(bx + enx * extOvershoot, by + eny * extOvershoot)
      ctx.stroke()
    }

    drawExt(p1.x, p1.y, d1x, d1y)
    drawExt(p2.x, p2.y, d2x, d2y)
    ctx.restore()
  }

  // خط البعد الرفيع الأنيق
  ctx.save()
  ctx.strokeStyle = lineColor
  ctx.lineWidth = Math.max(1.2, 1.45 * scale)
  ctx.beginPath()
  ctx.moveTo(d1x, d1y)
  ctx.lineTo(d2x, d2y)
  ctx.stroke()

  const arrowSize = 7.5 * scale
  drawEndTickOrArrow(ctx, d1x, d1y, -ux, -uy, arrowSize, lineColor)
  drawEndTickOrArrow(ctx, d2x, d2y, ux, uy, arrowSize, lineColor)

  // النص الإنجليزي الواضح بدون أي مربع أو خلفية
  const fontPx = Math.round(fontSizePx * scale)
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  ctx.direction = 'ltr'
  ctx.textBaseline = 'middle'

  const midX = (d1x + d2x) / 2
  const midY = (d1y + d2y) / 2
  const textShift = labelSide === 'outside' ? 18 * scale : 0
  const labelX = midX + outwardNormalX * textShift
  const labelY = midY + outwardNormalY * textShift

  const metrics = ctx.measureText(label)
  const halfTextW = metrics.width / 2
  const halfTextH = fontPx / 2
  const clampedX = Math.min(
    canvasW - halfTextW - 14 * scale,
    Math.max(halfTextW + 14 * scale, labelX)
  )
  const clampedY = Math.min(
    canvasH - halfTextH - 12 * scale,
    Math.max(halfTextH + 12 * scale, labelY)
  )

  ctx.textAlign = 'center'
  if (softHalo) {
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)'
    ctx.lineWidth = 3 * scale
    ctx.strokeText(label, clampedX, clampedY)
  }

  ctx.fillStyle = lineColor
  ctx.fillText(label, clampedX, clampedY)
  ctx.restore()
}

export function drawEcommerceDimensionsOnCanvas(
  ctx: CanvasRenderingContext2D,
  snapshot: EcommerceCaptureSnapshot,
  showInternalDimensions: boolean
): void {
  const { baseCanvas, camera, panels, width: outW, height: outH } = snapshot
  const scale = Math.min(2.2, Math.max(1.1, outW / 1200))

  // 1. خلفية بيضاء نقية + صورة المنتَج ثلاثي الأبعاد
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outW, outH)
  ctx.drawImage(baseCanvas, 0, 0, outW, outH)

  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()

  const overall = computeOverallDimensions(panels)
  if (!overall) return

  const { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth } = overall
  const corners: [number, number, number][] = [
    [minX, minY, minZ],
    [maxX, minY, minZ],
    [minX, maxY, minZ],
    [maxX, maxY, minZ],
    [minX, minY, maxZ],
    [maxX, minY, maxZ],
    [minX, maxY, maxZ],
    [maxX, maxY, maxZ],
  ]
  const projectedCorners = corners.map((c) => projectPoint(c[0], c[1], c[2], camera, outW, outH))
  const boxCenter2D = projectedCorners.reduce(
    (acc, pt) => ({
      x: acc.x + pt.x / projectedCorners.length,
      y: acc.y + pt.y / projectedCorners.length,
    }),
    { x: 0, y: 0 }
  )

  const boxCenterWorld = new THREE.Vector3(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  )
  const frontZ = camera.position.z >= boxCenterWorld.z ? maxZ : minZ
  const backZ = frontZ === maxZ ? minZ : maxZ

  // 2. المقاسات الثلاثة الأساسية فقط (Bounding Box):
  // (أ) العرض الكلي (Width - X) أسفل القطعة
  const w1 = projectPoint(minX, minY, frontZ, camera, outW, outH)
  const w2 = projectPoint(maxX, minY, frontZ, camera, outW, outH)
  if (w1.ndcZ <= 1 && w2.ndcZ <= 1) {
    const nW = chooseOutwardNormal(w1, w2, boxCenter2D)
    drawCleanDimensionLine({
      ctx,
      p1: w1,
      p2: w2,
      outwardNormalX: nW.nx,
      outwardNormalY: nW.ny,
      offsetPx: 54 * scale,
      label: formatEnCm(width),
      scale,
      canvasW: outW,
      canvasH: outH,
      lineColor: '#1f2937',
      fontSizePx: 16.5,
    })
  }

  // (ب) الارتفاع الكلي (Height - Y) على الجانب الأيسر للقطعة
  const verticalCandidates: [number, number][] = [
    [minX, frontZ],
    [maxX, frontZ],
    [minX, backZ],
    [maxX, backZ],
  ]
  let leftHeightEdge = {
    bot: projectPoint(minX, minY, frontZ, camera, outW, outH),
    top: projectPoint(minX, maxY, frontZ, camera, outW, outH),
    worldX: minX,
    worldZ: frontZ,
    minScreenX: Infinity,
  }
  for (const [vx, vz] of verticalCandidates) {
    const bot = projectPoint(vx, minY, vz, camera, outW, outH)
    const top = projectPoint(vx, maxY, vz, camera, outW, outH)
    if (bot.ndcZ > 1 || top.ndcZ > 1) continue
    const avgX = (bot.x + top.x) / 2
    if (avgX < leftHeightEdge.minScreenX) {
      leftHeightEdge = { bot, top, worldX: vx, worldZ: vz, minScreenX: avgX }
    }
  }
  if (leftHeightEdge.minScreenX < Infinity) {
    drawCleanDimensionLine({
      ctx,
      p1: leftHeightEdge.bot,
      p2: leftHeightEdge.top,
      outwardNormalX: -1,
      outwardNormalY: 0,
      offsetPx: 62 * scale,
      label: formatEnCm(height),
      scale,
      canvasW: outW,
      canvasH: outH,
      lineColor: '#1f2937',
      fontSizePx: 16.5,
    })
  }

  // (ج) العمق الكلي (Depth - Z) على الجانب الأيمن السفلي للقطعة
  const depthCandidates = [minX, maxX].map((vx) => {
    const a = projectPoint(vx, minY, minZ, camera, outW, outH)
    const b = projectPoint(vx, minY, maxZ, camera, outW, outH)
    const avgX = (a.x + b.x) / 2
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    return { vx, a, b, avgX, len }
  })
  const bestDepthEdge = depthCandidates.sort((p, q) => q.avgX - p.avgX)[0]
  if (
    bestDepthEdge &&
    bestDepthEdge.a.ndcZ <= 1 &&
    bestDepthEdge.b.ndcZ <= 1 &&
    bestDepthEdge.len >= 30 * scale
  ) {
    const nD = chooseOutwardNormal(bestDepthEdge.a, bestDepthEdge.b, boxCenter2D)
    drawCleanDimensionLine({
      ctx,
      p1: bestDepthEdge.a,
      p2: bestDepthEdge.b,
      outwardNormalX: nD.nx,
      outwardNormalY: nD.ny,
      offsetPx: 54 * scale,
      label: formatEnCm(depth),
      scale,
      canvasW: outW,
      canvasH: outH,
      lineColor: '#1f2937',
      fontSizePx: 16.5,
    })
  }

  // 3. المقاسات الداخلية الذكية (اختيارية)
  if (!showInternalDimensions) return

  // (أ) مقاس ارتفاع القاعدة / الرجول إن وجدت
  const basePanels = panels.filter((p) => isLegOrBaseRole(p.role))
  if (basePanels.length > 0) {
    let baseMinY = Infinity
    let baseMaxY = -Infinity
    for (const bp of basePanels) {
      const box = getPanelWorldBox(bp)
      baseMinY = Math.min(baseMinY, box.minY)
      baseMaxY = Math.max(baseMaxY, box.maxY)
    }
    const baseHeight = roundTo(baseMaxY - baseMinY, 1)
    if (baseHeight >= 3 && baseHeight < height - 5) {
      const oppX = leftHeightEdge.worldX === minX ? maxX : minX
      const b1 = projectPoint(oppX, baseMinY, frontZ, camera, outW, outH)
      const b2 = projectPoint(oppX, baseMaxY, frontZ, camera, outW, outH)
      if (b1.ndcZ <= 1 && b2.ndcZ <= 1) {
        const nB = chooseOutwardNormal(b1, b2, boxCenter2D)
        drawCleanDimensionLine({
          ctx,
          p1: b1,
          p2: b2,
          outwardNormalX: nB.nx,
          outwardNormalY: nB.ny,
          offsetPx: 36 * scale,
          label: formatEnCm(baseHeight),
          scale,
          canvasW: outW,
          canvasH: outH,
          lineColor: '#475569',
          fontSizePx: 13.5,
        })
      }
    }
  }

  // (ب) مقاسات الأدراج (عرض وارتفاع ممثل لكل مقاس درج مختلف)
  const drawers = panels.filter((p) => p.role === 'drawer')
  const seenDrawerSpecs = new Set<string>()
  let drawnDrawers = 0
  for (const drawer of drawers) {
    if (drawnDrawers >= 2) break
    const wKey = roundTo(drawer.dimensions.width, 1)
    const hKey = roundTo(drawer.dimensions.height, 1)
    const specKey = `${wKey}x${hKey}`
    if (seenDrawerSpecs.has(specKey)) continue
    seenDrawerSpecs.add(specKey)

    const box = getPanelWorldBox(drawer)
    const zFace = frontZ === maxZ ? box.maxZ : box.minZ
    // عرض الدرج
    if (wKey < width - 4) {
      const dw1 = projectPoint(box.minX, box.maxY - 1.5, zFace, camera, outW, outH)
      const dw2 = projectPoint(box.maxX, box.maxY - 1.5, zFace, camera, outW, outH)
      if (dw1.ndcZ <= 1 && dw2.ndcZ <= 1) {
        drawCleanDimensionLine({
          ctx,
          p1: dw1,
          p2: dw2,
          outwardNormalX: 0,
          outwardNormalY: 0,
          offsetPx: 0,
          label: formatEnCm(wKey),
          scale,
          canvasW: outW,
          canvasH: outH,
          lineColor: '#334155',
          fontSizePx: 13,
          labelSide: 'center',
          softHalo: true,
        })
      }
    }
    // ارتفاع الدرج
    const dh1 = projectPoint(box.maxX - 1.5, box.minY, zFace, camera, outW, outH)
    const dh2 = projectPoint(box.maxX - 1.5, box.maxY, zFace, camera, outW, outH)
    if (dh1.ndcZ <= 1 && dh2.ndcZ <= 1) {
      drawCleanDimensionLine({
        ctx,
        p1: dh1,
        p2: dh2,
        outwardNormalX: 0,
        outwardNormalY: 0,
        offsetPx: 0,
        label: formatEnCm(hKey),
        scale,
        canvasW: outW,
        canvasH: outH,
        lineColor: '#334155',
        fontSizePx: 13,
        labelSide: 'center',
        softHalo: true,
      })
    }
    drawnDrawers += 1
  }

  // (ج) ارتفاع الفتحات المفتوحة بين الرفوف والألواح الأفقية
  const horizBoxes = panels
    .filter((p) => p.role === 'horizontal' || p.role === 'shelf')
    .map((p) => getPanelWorldBox(p))
    .sort((a, b) => a.minY - b.minY)

  const frontCovers = panels
    .filter((p) => p.role === 'hinged_door' || p.role === 'sliding_door' || p.role === 'drawer')
    .map((p) => getPanelWorldBox(p))

  const seenGaps = new Set<string>()
  let drawnGaps = 0

  for (let i = 0; i < horizBoxes.length && drawnGaps < 3; i += 1) {
    const lower = horizBoxes[i]
    for (let j = i + 1; j < horizBoxes.length && drawnGaps < 3; j += 1) {
      const upper = horizBoxes[j]
      const gap = roundTo(upper.minY - lower.maxY, 1)
      if (gap < 8) continue

      const overlapMinX = Math.max(lower.minX, upper.minX)
      const overlapMaxX = Math.min(lower.maxX, upper.maxX)
      const overlapMinZ = Math.max(lower.minZ, upper.minZ)
      const overlapMaxZ = Math.min(lower.maxZ, upper.maxZ)
      if (overlapMaxX - overlapMinX < 10 || overlapMaxZ - overlapMinZ < 10) continue

      // التأكد من عدم وجود رف أوسط يقطع الفتحة في نفس النطاق الأفقي
      const hasMiddleShelf = horizBoxes.some(
        (mid, idx) =>
          idx !== i &&
          idx !== j &&
          mid.minY > lower.maxY + 1 &&
          mid.maxY < upper.minY - 1 &&
          Math.min(mid.maxX, overlapMaxX) - Math.max(mid.minX, overlapMinX) >= 8
      )
      if (hasMiddleShelf) continue

      const midX = (overlapMinX + overlapMaxX) / 2
      const midY = (lower.maxY + upper.minY) / 2
      const isCoveredByFront = frontCovers.some(
        (fc) =>
          midX >= fc.minX + 1 &&
          midX <= fc.maxX - 1 &&
          midY >= fc.minY + 1 &&
          midY <= fc.maxY - 1
      )
      if (isCoveredByFront) continue

      const gapKey = `${roundTo(lower.maxY, 1)}-${roundTo(upper.minY, 1)}`
      if (seenGaps.has(gapKey)) continue
      seenGaps.add(gapKey)

      const measureZ = frontZ === maxZ ? overlapMaxZ : overlapMinZ
      const gp1 = projectPoint(midX, lower.maxY, measureZ, camera, outW, outH)
      const gp2 = projectPoint(midX, upper.minY, measureZ, camera, outW, outH)
      if (gp1.ndcZ <= 1 && gp2.ndcZ <= 1) {
        drawCleanDimensionLine({
          ctx,
          p1: gp1,
          p2: gp2,
          outwardNormalX: 0,
          outwardNormalY: 0,
          offsetPx: 0,
          label: formatEnCm(gap),
          scale,
          canvasW: outW,
          canvasH: outH,
          lineColor: '#334155',
          fontSizePx: 13.5,
          labelSide: 'center',
          softHalo: true,
        })
        drawnGaps += 1
      }
    }
  }
}

export function composeEcommerceProductPng(
  snapshot: EcommerceCaptureSnapshot,
  showInternalDimensions: boolean
): string {
  const outCanvas = document.createElement('canvas')
  outCanvas.width = snapshot.width
  outCanvas.height = snapshot.height
  const ctx = outCanvas.getContext('2d')
  if (!ctx) {
    return snapshot.baseCanvas.toDataURL('image/png', 1.0)
  }

  drawEcommerceDimensionsOnCanvas(ctx, snapshot, showInternalDimensions)
  return outCanvas.toDataURL('image/png', 1.0)
}
