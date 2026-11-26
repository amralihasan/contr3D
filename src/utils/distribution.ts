import type { FurniturePanel } from '../types/furniture'
import { getPanelWorldBox, roundTo, type WorldBox } from './snapping'

export type DistributeAxis = 'x' | 'y'

export interface DistributionResult {
  panels: FurniturePanel[]
  applied: boolean
  axis: DistributeAxis
  gapCm?: number
  message: string
}

function overlaps2D(aMin1: number, aMax1: number, bMin1: number, bMax1: number, aMin2: number, aMax2: number, bMin2: number, bMax2: number): boolean {
  return aMax1 > bMin1 + 0.5 && aMin1 < bMax1 - 0.5 && aMax2 > bMin2 + 0.5 && aMin2 < bMax2 - 0.5
}

export function detectDistributeAxis(selectedBoxes: WorldBox[]): DistributeAxis {
  let sumRatio = 0
  for (const b of selectedBoxes) {
    sumRatio += b.hx >= b.hy ? 1 : -1
  }
  return sumRatio >= 0 ? 'y' : 'x'
}

/**
 * يوزع الأرفف أو القواطع المحددة بمسافات داخلية صافية متساوية تماماً
 */
export function computeAutoDistribution(
  allPanels: FurniturePanel[],
  selectedIds: string[],
  axisOverride?: DistributeAxis
): DistributionResult {
  const selected = allPanels.filter((p) => selectedIds.includes(p.id))
  if (selected.length === 0) {
    return {
      panels: allPanels,
      applied: false,
      axis: 'y',
      message: 'اختر لوحين أو أكثر للتوزيع المتساوي',
    }
  }

  const boxMap = new Map<string, WorldBox>()
  for (const p of allPanels) {
    boxMap.set(p.id, getPanelWorldBox(p))
  }

  const selectedBoxes = selected.map((p) => boxMap.get(p.id)!)
  const axis = axisOverride ?? detectDistributeAxis(selectedBoxes)

  const sorted = [...selected].sort((a, b) => {
    const ba = boxMap.get(a.id)!
    const bb = boxMap.get(b.id)!
    return axis === 'y' ? ba.cy - bb.cy : ba.cx - bb.cx
  })

  const nonSelected = allPanels.filter((p) => !selectedIds.includes(p.id))

  // الحالة 1: اختيار 3 عناصر أو أكثر -> التوزيع بين الأول والأخير
  if (sorted.length >= 3) {
    const firstBox = boxMap.get(sorted[0].id)!
    const lastBox = boxMap.get(sorted[sorted.length - 1].id)!
    const innerPanels = sorted.slice(1, -1)

    const startFace = axis === 'y' ? firstBox.maxY : firstBox.maxX
    const endFace = axis === 'y' ? lastBox.minY : lastBox.minX
    const totalInnerThickness = innerPanels.reduce((acc, p) => {
      const b = boxMap.get(p.id)!
      return acc + (axis === 'y' ? b.hy * 2 : b.hx * 2)
    }, 0)

    const span = endFace - startFace - totalInnerThickness
    if (span < -0.5) {
      return {
        panels: allPanels,
        applied: false,
        axis,
        message: 'المساحة بين اللوحين الخارجيين غير كافية للتوزيع',
      }
    }

    const gap = span / (innerPanels.length + 1)
    const nextPositions = new Map<string, number>()

    let cursor = startFace + gap
    for (const p of innerPanels) {
      const b = boxMap.get(p.id)!
      const half = axis === 'y' ? b.hy : b.hx
      nextPositions.set(p.id, roundTo(cursor + half, 2))
      cursor += half * 2 + gap
    }

    const updated = allPanels.map((p) => {
      const newCoord = nextPositions.get(p.id)
      if (newCoord === undefined) return p
      const pos: [number, number, number] = [...p.position]
      pos[axis === 'y' ? 1 : 0] = newCoord
      return { ...p, position: pos }
    })

    return {
      panels: updated,
      applied: true,
      axis,
      gapCm: roundTo(gap, 2),
      message: `تم التوزيع بالتساوي (صافي الفراغ ${roundTo(gap, 1)} سم)`,
    }
  }

  // الحالة 2: اختيار 1 أو 2 من الأرفف/القواطع داخل وحدة لها حدود محيطة
  const minSelStart = Math.min(
    ...sorted.map((p) => {
      const b = boxMap.get(p.id)!
      return axis === 'y' ? b.minY : b.minX
    })
  )
  const maxSelEnd = Math.max(
    ...sorted.map((p) => {
      const b = boxMap.get(p.id)!
      return axis === 'y' ? b.maxY : b.maxX
    })
  )

  const refBox = boxMap.get(sorted[0].id)!

  let lowerFace: number | null = axis === 'y' ? 0 : null
  let upperFace: number | null = null

  for (const other of nonSelected) {
    const ob = boxMap.get(other.id)!
    if (axis === 'y') {
      const overlapXZ = overlaps2D(
        refBox.minX,
        refBox.maxX,
        ob.minX,
        ob.maxX,
        refBox.minZ,
        refBox.maxZ,
        ob.minZ,
        ob.maxZ
      )
      if (!overlapXZ) continue
      if (ob.maxY <= minSelStart + 0.1) {
        if (lowerFace === null || ob.maxY > lowerFace) lowerFace = ob.maxY
      }
      if (ob.minY >= maxSelEnd - 0.1) {
        if (upperFace === null || ob.minY < upperFace) upperFace = ob.minY
      }
    } else {
      const overlapYZ = overlaps2D(
        refBox.minY,
        refBox.maxY,
        ob.minY,
        ob.maxY,
        refBox.minZ,
        refBox.maxZ,
        ob.minZ,
        ob.maxZ
      )
      if (!overlapYZ) continue
      if (ob.maxX <= minSelStart + 0.1) {
        if (lowerFace === null || ob.maxX > lowerFace) lowerFace = ob.maxX
      }
      if (ob.minX >= maxSelEnd - 0.1) {
        if (upperFace === null || ob.minX < upperFace) upperFace = ob.minX
      }
    }
  }

  if (lowerFace === null || upperFace === null) {
    return {
      panels: allPanels,
      applied: false,
      axis,
      message: 'اختر 3 ألواح أو أكثر (أو ضع لوحين محيطين) لتطبيق التوزيع المتساوي',
    }
  }

  const totalThickness = sorted.reduce((acc, p) => {
    const b = boxMap.get(p.id)!
    return acc + (axis === 'y' ? b.hy * 2 : b.hx * 2)
  }, 0)

  const span = upperFace - lowerFace - totalThickness
  if (span < -0.5) {
    return {
      panels: allPanels,
      applied: false,
      axis,
      message: 'المساحة الداخلية غير كافية لتوزيع الألواح',
    }
  }

  const gap = span / (sorted.length + 1)
  const nextPositions = new Map<string, number>()

  let cursor = lowerFace + gap
  for (const p of sorted) {
    const b = boxMap.get(p.id)!
    const half = axis === 'y' ? b.hy : b.hx
    nextPositions.set(p.id, roundTo(cursor + half, 2))
    cursor += half * 2 + gap
  }

  const updated = allPanels.map((p) => {
    const newCoord = nextPositions.get(p.id)
    if (newCoord === undefined) return p
    const pos: [number, number, number] = [...p.position]
    pos[axis === 'y' ? 1 : 0] = newCoord
    return { ...p, position: pos }
  })

  return {
    panels: updated,
    applied: true,
    axis,
    gapCm: roundTo(gap, 2),
    message: `تم التوزيع بالتساوي (صافي الفراغ ${roundTo(gap, 1)} سم)`,
  }
}
