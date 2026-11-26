import type { FurniturePanel, Vec3 } from '../types/furniture'
import { getPanelWorldBox, roundTo, type WorldBox } from './snapping'

export interface OverallDimensions {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  width: number
  height: number
  depth: number
}

export interface ClearanceSegment {
  id: string
  start: Vec3
  end: Vec3
  distanceCm: number
  label: string
}

export function computeOverallDimensions(panels: FurniturePanel[]): OverallDimensions | null {
  if (panels.length === 0) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const p of panels) {
    const b = getPanelWorldBox(p)
    if (b.minX < minX) minX = b.minX
    if (b.maxX > maxX) maxX = b.maxX
    if (b.minY < minY) minY = b.minY
    if (b.maxY > maxY) maxY = b.maxY
    if (b.minZ < minZ) minZ = b.minZ
    if (b.maxZ > maxZ) maxZ = b.maxZ
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    width: roundTo(maxX - minX, 1),
    height: roundTo(maxY - minY, 1),
    depth: roundTo(maxZ - minZ, 1),
  }
}

function overlapsRange(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMax > bMin + 0.5 && aMin < bMax - 0.5
}

/**
 * يحسب المسافات الصافية (الفراغ الداخلي) حول اللوح المحدد مقارنة بالألواح المجاورة أو الأرضية
 */
export function computeSelectedClearances(
  selected: FurniturePanel,
  allVisible: FurniturePanel[]
): ClearanceSegment[] {
  const sb: WorldBox = getPanelWorldBox(selected)
  const others = allVisible.filter((p) => p.id !== selected.id).map(getPanelWorldBox)
  const segments: ClearanceSegment[] = []

  // 1) الفراغ العلوي
  let nearestAbove: number | null = null
  for (const ob of others) {
    if (
      ob.minY >= sb.maxY - 0.05 &&
      overlapsRange(sb.minX, sb.maxX, ob.minX, ob.maxX) &&
      overlapsRange(sb.minZ, sb.maxZ, ob.minZ, ob.maxZ)
    ) {
      if (nearestAbove === null || ob.minY < nearestAbove) {
        nearestAbove = ob.minY
      }
    }
  }
  if (nearestAbove !== null && nearestAbove - sb.maxY > 0.15) {
    const dist = roundTo(nearestAbove - sb.maxY, 1)
    segments.push({
      id: 'above',
      start: [sb.cx, sb.maxY, sb.maxZ + 1.5],
      end: [sb.cx, nearestAbove, sb.maxZ + 1.5],
      distanceCm: dist,
      label: `صافي أعلى: ${dist} سم`,
    })
  }

  // 2) الفراغ السفلي (أقرب لوح بالأسفل أو الأرضية Y = 0)
  let nearestBelow: number = 0
  let belowIsFloor = true
  for (const ob of others) {
    if (
      ob.maxY <= sb.minY + 0.05 &&
      overlapsRange(sb.minX, sb.maxX, ob.minX, ob.maxX) &&
      overlapsRange(sb.minZ, sb.maxZ, ob.minZ, ob.maxZ)
    ) {
      if (ob.maxY > nearestBelow) {
        nearestBelow = ob.maxY
        belowIsFloor = false
      }
    }
  }
  if (sb.minY - nearestBelow > 0.15) {
    const dist = roundTo(sb.minY - nearestBelow, 1)
    segments.push({
      id: 'below',
      start: [sb.cx, nearestBelow, sb.maxZ + 1.5],
      end: [sb.cx, sb.minY, sb.maxZ + 1.5],
      distanceCm: dist,
      label: belowIsFloor ? `عن الأرض: ${dist} سم` : `صافي أسفل: ${dist} سم`,
    })
  }

  // 3) الفراغ على اليسار (-X)
  let nearestLeft: number | null = null
  for (const ob of others) {
    if (
      ob.maxX <= sb.minX + 0.05 &&
      overlapsRange(sb.minY, sb.maxY, ob.minY, ob.maxY) &&
      overlapsRange(sb.minZ, sb.maxZ, ob.minZ, ob.maxZ)
    ) {
      if (nearestLeft === null || ob.maxX > nearestLeft) {
        nearestLeft = ob.maxX
      }
    }
  }
  if (nearestLeft !== null && sb.minX - nearestLeft > 0.15) {
    const dist = roundTo(sb.minX - nearestLeft, 1)
    segments.push({
      id: 'left',
      start: [nearestLeft, sb.cy, sb.maxZ + 1.5],
      end: [sb.minX, sb.cy, sb.maxZ + 1.5],
      distanceCm: dist,
      label: `صافي يسار: ${dist} سم`,
    })
  }

  // 4) الفراغ على اليمين (+X)
  let nearestRight: number | null = null
  for (const ob of others) {
    if (
      ob.minX >= sb.maxX - 0.05 &&
      overlapsRange(sb.minY, sb.maxY, ob.minY, ob.maxY) &&
      overlapsRange(sb.minZ, sb.maxZ, ob.minZ, ob.maxZ)
    ) {
      if (nearestRight === null || ob.minX < nearestRight) {
        nearestRight = ob.minX
      }
    }
  }
  if (nearestRight !== null && nearestRight - sb.maxX > 0.15) {
    const dist = roundTo(nearestRight - sb.maxX, 1)
    segments.push({
      id: 'right',
      start: [sb.maxX, sb.cy, sb.maxZ + 1.5],
      end: [nearestRight, sb.cy, sb.maxZ + 1.5],
      distanceCm: dist,
      label: `صافي يمين: ${dist} سم`,
    })
  }

  return segments
}
