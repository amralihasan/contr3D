import { MATERIALS } from '../constants/materials'
import type { MaterialId } from '../types/furniture'
import type { CutPieceItem } from './cutList'
import { roundTo } from './snapping'

export const STANDARD_SHEET_LENGTH_CM = 244
export const STANDARD_SHEET_WIDTH_CM = 122
export const DEFAULT_KERF_CM = 0.4

export interface SheetPlacement {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  cutLengthCm: number
  cutWidthCm: number
  rotated: boolean
}

export interface PackedSheet {
  sheetNumber: number
  materialId: MaterialId
  materialLabel: string
  thicknessMm: number
  placements: SheetPlacement[]
  usedAreaCm2: number
  totalAreaCm2: number
  utilizationPct: number
  wastePct: number
}

export interface NestingGroup {
  key: string
  materialId: MaterialId
  materialLabel: string
  thicknessCm: number
  thicknessMm: number
  sheets: PackedSheet[]
  totalPieces: number
  oversizedPieces: CutPieceItem[]
  utilizationPct: number
  wastePct: number
}

export interface NestingReport {
  groups: NestingGroup[]
  totalSheets: number
  overallUtilizationPct: number
  overallWastePct: number
  kerfCm: number
}

interface FreeRect {
  x: number
  y: number
  w: number
  h: number
}

function pruneFreeRects(rects: FreeRect[]): FreeRect[] {
  const filtered = rects.filter((r) => r.w >= 0.5 && r.h >= 0.5)
  const result: FreeRect[] = []
  for (let i = 0; i < filtered.length; i++) {
    const a = filtered[i]
    let contained = false
    for (let j = 0; j < filtered.length; j++) {
      if (i === j) continue
      const b = filtered[j]
      if (
        a.x >= b.x - 0.001 &&
        a.y >= b.y - 0.001 &&
        a.x + a.w <= b.x + b.w + 0.001 &&
        a.y + a.h <= b.y + b.h + 0.001
      ) {
        contained = true
        break
      }
    }
    if (!contained) result.push(a)
  }
  return result
}

function packGroupPieces(
  pieces: CutPieceItem[],
  materialId: MaterialId,
  thicknessCm: number,
  kerfCm: number,
  respectWoodGrain: boolean
): NestingGroup {
  const sheetW = STANDARD_SHEET_LENGTH_CM
  const sheetH = STANDARD_SHEET_WIDTH_CM
  const sheetArea = sheetW * sheetH
  const matSpec = MATERIALS[materialId]
  const allowRotate = !(respectWoodGrain && matSpec.hasWoodGrain)

  const oversizedPieces: CutPieceItem[] = []
  const packable: CutPieceItem[] = []

  for (const p of pieces) {
    const fitsNormal = p.lengthCm <= sheetW + 0.001 && p.widthCm <= sheetH + 0.001
    const fitsRotated = allowRotate && p.widthCm <= sheetW + 0.001 && p.lengthCm <= sheetH + 0.001
    if (!fitsNormal && !fitsRotated) {
      oversizedPieces.push(p)
    } else {
      packable.push(p)
    }
  }

  // ترتيب تنازلي حسب البعد الأكبر ثم المساحة
  const sorted = [...packable].sort((a, b) => {
    const areaDiff = b.lengthCm * b.widthCm - a.lengthCm * a.widthCm
    if (Math.abs(areaDiff) > 1) return areaDiff
    return Math.max(b.lengthCm, b.widthCm) - Math.max(a.lengthCm, a.widthCm)
  })

  interface SheetBin {
    freeRects: FreeRect[]
    placements: SheetPlacement[]
    usedAreaCm2: number
  }

  const bins: SheetBin[] = []

  const tryPlaceInBin = (bin: SheetBin, piece: CutPieceItem): boolean => {
    let bestRectIdx = -1
    let bestRotated = false
    let bestW = 0
    let bestH = 0
    let bestScore = Infinity

    for (let i = 0; i < bin.freeRects.length; i++) {
      const r = bin.freeRects[i]

      // وضع أفقي (الطول على محور 244)
      if (piece.lengthCm <= r.w + 0.001 && piece.widthCm <= r.h + 0.001) {
        const leftover = Math.min(r.w - piece.lengthCm, r.h - piece.widthCm)
        const areaScore = r.w * r.h - piece.lengthCm * piece.widthCm
        const score = leftover * 10000 + areaScore
        if (score < bestScore) {
          bestScore = score
          bestRectIdx = i
          bestRotated = false
          bestW = piece.lengthCm
          bestH = piece.widthCm
        }
      }

      // وضع مدوّر 90 درجة
      if (
        allowRotate &&
        piece.widthCm !== piece.lengthCm &&
        piece.widthCm <= r.w + 0.001 &&
        piece.lengthCm <= r.h + 0.001
      ) {
        const leftover = Math.min(r.w - piece.widthCm, r.h - piece.lengthCm)
        const areaScore = r.w * r.h - piece.lengthCm * piece.widthCm
        const score = leftover * 10000 + areaScore
        if (score < bestScore) {
          bestScore = score
          bestRectIdx = i
          bestRotated = true
          bestW = piece.widthCm
          bestH = piece.lengthCm
        }
      }
    }

    if (bestRectIdx === -1) return false

    const r = bin.freeRects[bestRectIdx]
    bin.placements.push({
      id: piece.id,
      name: piece.name,
      x: roundTo(r.x, 2),
      y: roundTo(r.y, 2),
      width: roundTo(bestW, 2),
      height: roundTo(bestH, 2),
      cutLengthCm: piece.lengthCm,
      cutWidthCm: piece.widthCm,
      rotated: bestRotated,
    })
    bin.usedAreaCm2 += bestW * bestH

    // تقسيم المستطيل المتبقي بنظام Guillotine مع حساب سُمك سلاح المنشار (Kerf)
    const remRightW = r.w - bestW - kerfCm
    const remBottomH = r.h - bestH - kerfCm

    const nextFree: FreeRect[] = []
    for (let i = 0; i < bin.freeRects.length; i++) {
      if (i !== bestRectIdx) nextFree.push(bin.freeRects[i])
    }

    // اختيار اتجاه القص (أفقي أو رأسي) لإعطاء أكبر مساحة متصلة ممكنة
    const splitHorizMax = Math.max(remRightW * bestH, r.w * remBottomH)
    const splitVertMax = Math.max(remRightW * r.h, bestW * remBottomH)

    if (splitHorizMax >= splitVertMax) {
      if (remRightW > 0.5) {
        nextFree.push({ x: r.x + bestW + kerfCm, y: r.y, w: remRightW, h: bestH })
      }
      if (remBottomH > 0.5) {
        nextFree.push({ x: r.x, y: r.y + bestH + kerfCm, w: r.w, h: remBottomH })
      }
    } else {
      if (remRightW > 0.5) {
        nextFree.push({ x: r.x + bestW + kerfCm, y: r.y, w: remRightW, h: r.h })
      }
      if (remBottomH > 0.5) {
        nextFree.push({ x: r.x, y: r.y + bestH + kerfCm, w: bestW, h: remBottomH })
      }
    }

    bin.freeRects = pruneFreeRects(nextFree)
    return true
  }

  for (const piece of sorted) {
    let placed = false
    for (const bin of bins) {
      if (tryPlaceInBin(bin, piece)) {
        placed = true
        break
      }
    }
    if (!placed) {
      const freshBin: SheetBin = {
        freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
        placements: [],
        usedAreaCm2: 0,
      }
      tryPlaceInBin(freshBin, piece)
      bins.push(freshBin)
    }
  }

  const thicknessMm = Math.round(thicknessCm * 10)
  const sheets: PackedSheet[] = bins.map((bin, idx) => {
    const util = roundTo(Math.min(100, (bin.usedAreaCm2 / sheetArea) * 100), 1)
    return {
      sheetNumber: idx + 1,
      materialId,
      materialLabel: matSpec.label,
      thicknessMm,
      placements: bin.placements,
      usedAreaCm2: roundTo(bin.usedAreaCm2, 1),
      totalAreaCm2: sheetArea,
      utilizationPct: util,
      wastePct: roundTo(100 - util, 1),
    }
  })

  const totalUsed = sheets.reduce((s, sh) => s + sh.usedAreaCm2, 0)
  const totalCap = Math.max(1, sheets.length * sheetArea)
  const groupUtil = sheets.length > 0 ? roundTo((totalUsed / totalCap) * 100, 1) : 0

  return {
    key: `${materialId}|${thicknessMm}`,
    materialId,
    materialLabel: matSpec.label,
    thicknessCm,
    thicknessMm,
    sheets,
    totalPieces: packable.length,
    oversizedPieces,
    utilizationPct: groupUtil,
    wastePct: sheets.length > 0 ? roundTo(100 - groupUtil, 1) : 0,
  }
}

/**
 * يرص جميع قطع التقطيع على ألواح كونتر قياسية (122 × 244 سم) مقسمة حسب السُمك والخامة
 */
export function optimizeSheetNesting(
  pieces: CutPieceItem[],
  kerfCm = DEFAULT_KERF_CM,
  respectWoodGrain = false
): NestingReport {
  const safeKerf = Math.max(0, Math.min(2, kerfCm))
  const groupedPieces = new Map<string, { materialId: MaterialId; thicknessCm: number; items: CutPieceItem[] }>()

  for (const piece of pieces) {
    const thicknessMm = Math.round(piece.thicknessCm * 10)
    const key = `${piece.materialId}|${thicknessMm}`
    const existing = groupedPieces.get(key)
    if (existing) {
      existing.items.push(piece)
    } else {
      groupedPieces.set(key, {
        materialId: piece.materialId,
        thicknessCm: piece.thicknessCm,
        items: [piece],
      })
    }
  }

  const groups: NestingGroup[] = Array.from(groupedPieces.values())
    .map((g) => packGroupPieces(g.items, g.materialId, g.thicknessCm, safeKerf, respectWoodGrain))
    .sort((a, b) => {
      if (b.thicknessMm !== a.thicknessMm) return b.thicknessMm - a.thicknessMm
      return a.materialLabel.localeCompare(b.materialLabel, 'ar')
    })

  const totalSheets = groups.reduce((s, g) => s + g.sheets.length, 0)
  const totalUsedArea = groups.reduce(
    (s, g) => s + g.sheets.reduce((ss, sh) => ss + sh.usedAreaCm2, 0),
    0
  )
  const totalSheetArea = totalSheets * STANDARD_SHEET_LENGTH_CM * STANDARD_SHEET_WIDTH_CM
  const overallUtil = totalSheetArea > 0 ? roundTo((totalUsedArea / totalSheetArea) * 100, 1) : 0

  return {
    groups,
    totalSheets,
    overallUtilizationPct: overallUtil,
    overallWastePct: totalSheets > 0 ? roundTo(100 - overallUtil, 1) : 0,
    kerfCm: safeKerf,
  }
}
