import * as THREE from 'three'
import { isLegOrBaseRole, type FurniturePanel } from '../types/furniture'
import { computeOverallDimensions } from './dimensions'
import { getPanelWorldBox, roundTo } from './snapping'

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

function formatCm(value: number): string {
  const rounded = roundTo(value, 1)
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  dirX: number,
  dirY: number,
  size: number,
  color: string
) {
  const angle = Math.atan2(dirY, dirX)
  const spread = 0.34
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

interface DrawDimensionOptions {
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
  accentColor?: string
}

function drawDimensionLine({
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
  accentColor = '#1e293b',
}: DrawDimensionOptions) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const segLen = Math.hypot(dx, dy)
  if (segLen < 24 * scale) return

  const ux = dx / segLen
  const uy = dy / segLen

  // إزاحة خط البعد خارج حدود المجسم مع إبقائه داخل حدود اللوحة
  const pad = 42 * scale
  const rawD1x = p1.x + outwardNormalX * offsetPx
  const rawD1y = p1.y + outwardNormalY * offsetPx
  const rawD2x = p2.x + outwardNormalX * offsetPx
  const rawD2y = p2.y + outwardNormalY * offsetPx

  const d1x = Math.min(canvasW - pad, Math.max(pad, rawD1x))
  const d1y = Math.min(canvasH - pad - 46 * scale, Math.max(pad, rawD1y))
  const d2x = Math.min(canvasW - pad, Math.max(pad, rawD2x))
  const d2y = Math.min(canvasH - pad - 46 * scale, Math.max(pad, rawD2y))

  const extGap = 6 * scale
  const extOvershoot = 8 * scale

  // خطوط الامتداد (Extension lines)
  ctx.save()
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = Math.max(1, 1.15 * scale)
  ctx.setLineDash([4 * scale, 3 * scale])

  const drawExt = (ax: number, ay: number, bx: number, by: number) => {
    const ex = bx - ax
    const ey = by - ay
    const elen = Math.hypot(ex, ey)
    if (elen < extGap + 2) return
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

  // خط البعد الرئيسي
  ctx.save()
  ctx.strokeStyle = accentColor
  ctx.lineWidth = Math.max(1.4, 1.8 * scale)
  ctx.beginPath()
  ctx.moveTo(d1x, d1y)
  ctx.lineTo(d2x, d2y)
  ctx.stroke()

  // الأسهم عند الطرفين
  const arrowSize = 9.5 * scale
  drawArrowhead(ctx, d1x, d1y, -ux, -uy, arrowSize, accentColor)
  drawArrowhead(ctx, d2x, d2y, ux, uy, arrowSize, accentColor)

  // بطاقة النص بخلفية بيضاء واضحة
  const midX = (d1x + d2x) / 2
  const midY = (d1y + d2y) / 2
  const fontSize = Math.round(13.5 * scale)
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = 'rtl'

  const metrics = ctx.measureText(label)
  const boxPadX = 9 * scale
  const boxPadY = 4.5 * scale
  const boxW = metrics.width + boxPadX * 2
  const boxH = fontSize + boxPadY * 2

  const clampedMidX = Math.min(canvasW - boxW / 2 - 12 * scale, Math.max(boxW / 2 + 12 * scale, midX))
  const clampedMidY = Math.min(canvasH - boxH / 2 - 50 * scale, Math.max(boxH / 2 + 12 * scale, midY))

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(1, 1 * scale)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(clampedMidX - boxW / 2, clampedMidY - boxH / 2, boxW, boxH, 5 * scale)
  } else {
    ctx.rect(clampedMidX - boxW / 2, clampedMidY - boxH / 2, boxW, boxH)
  }
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = accentColor
  ctx.fillText(label, clampedMidX, clampedMidY + 0.5 * scale)
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

/**
 * يولّد صورة رسم هندسي عالية الدقة (2x) باللونين الأبيض والأسود مع إسقاط 3D→2D للمقاسات والأسهم.
 */
export function exportSketchWithDimensions(
  webglCanvas: HTMLCanvasElement,
  camera: THREE.Camera,
  panels: FurniturePanel[],
  designName: string
): string {
  const baseW = webglCanvas.clientWidth || webglCanvas.width || 1280
  const baseH = webglCanvas.clientHeight || webglCanvas.height || 720
  const outW = Math.min(3840, Math.round(baseW * 2))
  const outH = Math.max(1, Math.round(outW * (baseH / Math.max(1, baseW))))
  const scale = Math.min(2.2, Math.max(1.15, outW / 1200))

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const ctx = outCanvas.getContext('2d')
  if (!ctx) {
    return webglCanvas.toDataURL('image/png', 1.0)
  }

  // خلفية بيضاء نقية للرسم الهندسي
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outW, outH)

  // رسم مشهد الـ WebGL بالخطوط الداكنة
  ctx.drawImage(webglCanvas, 0, 0, outW, outH)

  camera.updateMatrixWorld()

  const overall = computeOverallDimensions(panels)
  if (overall) {
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
    const rightX = camera.position.x >= boxCenterWorld.x ? maxX : minX

    // 1. خط العرض الكلي (على طول محور X في أسفل الواجهة الأمامية)
    const w1 = projectPoint(minX, minY, frontZ, camera, outW, outH)
    const w2 = projectPoint(maxX, minY, frontZ, camera, outW, outH)
    if (w1.ndcZ <= 1 && w2.ndcZ <= 1) {
      const nW = chooseOutwardNormal(w1, w2, boxCenter2D)
      drawDimensionLine({
        ctx,
        p1: w1,
        p2: w2,
        outwardNormalX: nW.nx,
        outwardNormalY: nW.ny,
        offsetPx: 44 * scale,
        label: `العرض: ${formatCm(width)} سم`,
        scale,
        canvasW: outW,
        canvasH: outH,
      })
    }

    // 2. خط العمق الكلي (على طول محور Z على الحافة الجانبية القريبة للكاميرا)
    const d1 = projectPoint(rightX, minY, minZ, camera, outW, outH)
    const d2 = projectPoint(rightX, minY, maxZ, camera, outW, outH)
    if (d1.ndcZ <= 1 && d2.ndcZ <= 1) {
      const nD = chooseOutwardNormal(d1, d2, boxCenter2D)
      drawDimensionLine({
        ctx,
        p1: d1,
        p2: d2,
        outwardNormalX: nD.nx,
        outwardNormalY: nD.ny,
        offsetPx: 44 * scale,
        label: `العمق: ${formatCm(depth)} سم`,
        scale,
        canvasW: outW,
        canvasH: outH,
      })
    }

    // 3. خط الارتفاع الكلي (على أبعد حافة رأسية عن المركز في الإسقاط الأفقي)
    const verticalCandidates: [number, number][] = [
      [minX, frontZ],
      [maxX, frontZ],
      [minX, frontZ === maxZ ? minZ : maxZ],
      [maxX, frontZ === maxZ ? minZ : maxZ],
    ]
    let bestHeightEdge = {
      bot: projectPoint(minX, minY, frontZ, camera, outW, outH),
      top: projectPoint(minX, maxY, frontZ, camera, outW, outH),
      worldX: minX,
      worldZ: frontZ,
      score: -1,
    }
    for (const [vx, vz] of verticalCandidates) {
      const bot = projectPoint(vx, minY, vz, camera, outW, outH)
      const top = projectPoint(vx, maxY, vz, camera, outW, outH)
      if (bot.ndcZ > 1 || top.ndcZ > 1) continue
      const horizDist = Math.abs((bot.x + top.x) / 2 - boxCenter2D.x)
      if (horizDist > bestHeightEdge.score) {
        bestHeightEdge = { bot, top, worldX: vx, worldZ: vz, score: horizDist }
      }
    }

    const nH = chooseOutwardNormal(bestHeightEdge.bot, bestHeightEdge.top, boxCenter2D)
    drawDimensionLine({
      ctx,
      p1: bestHeightEdge.bot,
      p2: bestHeightEdge.top,
      outwardNormalX: nH.nx,
      outwardNormalY: nH.ny,
      offsetPx: 50 * scale,
      label: `الارتفاع: ${formatCm(height)} سم`,
      scale,
      canvasW: outW,
      canvasH: outH,
    })

    // 4. ارتفاع القاعدة / الرجول إن وجدت
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
      if (baseHeight >= 1 && baseHeight < height - 1) {
        const oppX = bestHeightEdge.worldX === minX ? maxX : minX
        const b1 = projectPoint(oppX, baseMinY, bestHeightEdge.worldZ, camera, outW, outH)
        const b2 = projectPoint(oppX, baseMaxY, bestHeightEdge.worldZ, camera, outW, outH)
        if (b1.ndcZ <= 1 && b2.ndcZ <= 1) {
          const nB = chooseOutwardNormal(b1, b2, boxCenter2D)
          drawDimensionLine({
            ctx,
            p1: b1,
            p2: b2,
            outwardNormalX: nB.nx,
            outwardNormalY: nB.ny,
            offsetPx: 42 * scale,
            label: `القاعدة: ${formatCm(baseHeight)} سم`,
            scale,
            canvasW: outW,
            canvasH: outH,
            accentColor: '#334155',
          })
        }
      }
    }
  }

  // إطار اللوحة الهندسي
  const framePad = 12 * scale
  ctx.save()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = Math.max(1, 1.2 * scale)
  ctx.strokeRect(framePad, framePad, outW - framePad * 2, outH - framePad * 2)

  // شريط البيانات التنفيذية في أسفل الرسم الهندسي
  const barH = 38 * scale
  const barY = outH - framePad - barH
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(framePad, barY, outW - framePad * 2, barH)
  ctx.beginPath()
  ctx.moveTo(framePad, barY)
  ctx.lineTo(outW - framePad, barY)
  ctx.strokeStyle = '#cbd5e1'
  ctx.stroke()

  const titleFont = Math.round(13 * scale)
  const metaFont = Math.round(11.5 * scale)
  ctx.textBaseline = 'middle'
  ctx.direction = 'rtl'

  // اسم التصميم (يمين)
  ctx.font = `700 ${titleFont}px system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillStyle = '#0f172a'
  const cleanTitle = designName.trim() || 'تصميم أثاث كونتر'
  ctx.fillText(`رسم هندسي: ${cleanTitle}`, outW - framePad - 14 * scale, barY + barH / 2)

  // المقاسات الإجمالية + عدد الأجزاء (يسار)
  ctx.font = `600 ${metaFont}px system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillStyle = '#334155'
  const summaryText = overall
    ? `الأبعاد الكلية: ${formatCm(overall.width)} × ${formatCm(overall.height)} × ${formatCm(overall.depth)} سم  |  القطع: ${panels.length}  |  الوحدة: سم`
    : `عدد القطع: ${panels.length}  |  الوحدة: سم`
  ctx.fillText(summaryText, framePad + 14 * scale, barY + barH / 2)
  ctx.restore()

  return outCanvas.toDataURL('image/png', 1.0)
}
