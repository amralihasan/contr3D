import { MATERIALS } from '../constants/materials'
import {
  getEffectiveEdgeBanding,
  getEffectivePanelHandle,
  type EdgeBanding,
  type FurniturePanel,
  type HandleColor,
  type HandleType,
  type MaterialId,
  type MetalBaseColor,
  type PanelHandleConfig,
  type PanelRole,
} from '../types/furniture'
import { roundTo } from './snapping'

export interface CutPieceItem {
  id: string
  sourcePanelId: string
  name: string
  roleLabel: string
  lengthCm: number
  widthCm: number
  thicknessCm: number
  materialId: MaterialId
  edgeBanding: EdgeBanding
  edgeMetersPerPiece: number
  edgeLabel: string
  workshopNotes: string
}

export interface GroupedCutRow {
  key: string
  names: string[]
  roleLabel: string
  lengthCm: number
  widthCm: number
  thicknessCm: number
  thicknessMm: number
  materialId: MaterialId
  materialLabel: string
  quantity: number
  edgeBanding: EdgeBanding
  edgeLabel: string
  totalEdgeMeters: number
  workshopNotes: string
}

export interface EdgeBandingMaterialTotal {
  materialId: MaterialId
  materialLabel: string
  meters: number
}

export interface HardwareItem {
  key: string
  name: string
  dimensionsLabel: string
  materialLabel: string
  quantity: number
}

export interface CutListReport {
  pieces: CutPieceItem[]
  rows: GroupedCutRow[]
  edgeTotalsByMaterial: EdgeBandingMaterialTotal[]
  totalEdgeMeters: number
  totalCutPieces: number
  hardware: HardwareItem[]
}

const ROLE_LABELS: Record<PanelRole, string> = {
  horizontal: 'قرصة / لوح أفقي',
  vertical: 'جنب رأسي',
  shelf: 'رف داخلي',
  divider: 'قاطع رأسي',
  back: 'ضهر',
  hinged_door: 'ضلفة مفصلية',
  sliding_door: 'ضلفة جرار',
  drawer: 'درج',
  plinth_base: 'وزرة / سوكلة',
  plinth_recessed: 'سوكلة خشب غاطسة',
  wood_legs: 'طقم 4 رجول خشب مايلة',
  metal_legs: 'طقم 4 رجول معدن مستقيمة',
  metal_frame: 'شاسيه معدن مستطيل',
  metal_u_legs: 'رجول معدن حرف U',
  metal_x_legs: 'قاعدة معدن حرف X',
  wood_pillars: 'قاعدة أعمدة أسطوانية خشب',
  wood_arch: 'قاعدة خشب مقوّسة (أرش)',
  custom: 'لوح مخصص',
}

const METAL_COLOR_LABELS: Record<MetalBaseColor, string> = {
  matte_black: 'أسود مط',
  gold: 'ذهبي',
  matte_white: 'أبيض مط',
  anthracite: 'رمادي أنثراسيت',
}

const HANDLE_TYPE_LABELS: Record<HandleType, string> = {
  bar: 'مقبض بار مودرن',
  knob: 'مقبض زرار دائري',
  edge: 'مقبض بروفايل حافة',
  recessed: 'مقبض غاطس',
  none: 'فتح بالتاتش (Push-to-open)',
}

const HANDLE_COLOR_LABELS: Record<HandleColor, string> = {
  black: 'أسود مط',
  gold: 'ذهبي',
  silver: 'فضي',
  wood: 'خشبي',
}

function formatHandleWorkshopNote(handle: PanelHandleConfig): string {
  if (handle.type === 'none') {
    return HANDLE_TYPE_LABELS.none
  }
  const typeLabel = HANDLE_TYPE_LABELS[handle.type]
  const colorLabel = HANDLE_COLOR_LABELS[handle.color]
  const lenText =
    (handle.type === 'bar' || handle.type === 'edge') && handle.length
      ? ` (${handle.length} سم)`
      : ''
  return `${typeLabel} ${colorLabel}${lenText}`
}

function formatEdgeSummary(eb: EdgeBanding): string {
  const parts: string[] = []
  if (eb.top) parts.push('أمامي/أعلى')
  if (eb.bottom) parts.push('خلفي/أسفل')
  if (eb.right) parts.push('يمين')
  if (eb.left) parts.push('يسار')
  if (parts.length === 0) return 'بدون شريط'
  if (parts.length === 4) return '4 حروف (كامل)'
  return parts.join(' + ')
}

function edgeSignature(eb: EdgeBanding): string {
  return `${eb.top ? 1 : 0}${eb.bottom ? 1 : 0}${eb.right ? 1 : 0}${eb.left ? 1 : 0}`
}

function buildPanelWorkshopNotes(panel: FurniturePanel): string {
  const notes: string[] = []
  const cr = panel.cornerRadius
  if (cr && (cr.tl > 0.01 || cr.tr > 0.01 || cr.bl > 0.01 || cr.br > 0.01)) {
    const allEqual =
      Math.abs(cr.tl - cr.tr) < 0.01 &&
      Math.abs(cr.tl - cr.bl) < 0.01 &&
      Math.abs(cr.tl - cr.br) < 0.01
    if (allEqual) {
      notes.push(`دوران 4 زوايا R=${cr.tl} سم`)
    } else {
      const corners: string[] = []
      if (cr.tr > 0.01) corners.push(`أعلى يمين ${cr.tr}`)
      if (cr.tl > 0.01) corners.push(`أعلى يسار ${cr.tl}`)
      if (cr.br > 0.01) corners.push(`أسفل يمين ${cr.br}`)
      if (cr.bl > 0.01) corners.push(`أسفل يسار ${cr.bl}`)
      notes.push(`دوران زوايا (${corners.join('، ')}) سم`)
    }
  }

  if (panel.cutouts && panel.cutouts.length > 0) {
    for (const c of panel.cutouts) {
      if (c.shape === 'circle') {
        const d = c.diameter ?? c.width
        notes.push(`فتحة سلك دائرية Ø${d} سم (${c.x},${c.y})`)
      } else {
        notes.push(`فتحة سلك مستطيلة ${c.width}×${c.height} سم (${c.x},${c.y})`)
      }
    }
  }

  return notes.join(' | ')
}

function calcEdgeMeters(
  primaryDimCm: number,
  secondaryDimCm: number,
  eb: EdgeBanding
): number {
  const cm =
    (eb.top ? primaryDimCm : 0) +
    (eb.bottom ? primaryDimCm : 0) +
    (eb.right ? secondaryDimCm : 0) +
    (eb.left ? secondaryDimCm : 0)
  return roundTo(cm / 100, 3)
}

function getBoardCutAxes(panel: FurniturePanel): {
  thicknessCm: number
  primaryDimCm: number
  secondaryDimCm: number
} {
  const { width, height, depth } = panel.dimensions
  if (panel.thicknessAxis === 'y') {
    return { thicknessCm: height, primaryDimCm: width, secondaryDimCm: depth }
  }
  if (panel.thicknessAxis === 'x') {
    return { thicknessCm: width, primaryDimCm: height, secondaryDimCm: depth }
  }
  return { thicknessCm: depth, primaryDimCm: width, secondaryDimCm: height }
}

/**
 * يحلل كل عناصر التصميم ويولد كشف التقطيع التلقائي وحساب شريط الحرف
 */
export function buildCutListReport(panels: FurniturePanel[]): CutListReport {
  const pieces: CutPieceItem[] = []
  const hardwareMap = new Map<string, HardwareItem>()

  for (const panel of panels) {
    const eb = getEffectiveEdgeBanding(panel)

    // 1. الرجول والشاسيهات المعدنية والأعمدة الجاهزة: إكسسوارات وليست تقطيع ألواح كونتر
    if (
      panel.role === 'wood_legs' ||
      panel.role === 'metal_legs' ||
      panel.role === 'metal_frame' ||
      panel.role === 'metal_u_legs' ||
      panel.role === 'metal_x_legs' ||
      panel.role === 'wood_pillars'
    ) {
      const isMetal =
        panel.role === 'metal_legs' ||
        panel.role === 'metal_frame' ||
        panel.role === 'metal_u_legs' ||
        panel.role === 'metal_x_legs'
      const matLabel = isMetal
        ? METAL_COLOR_LABELS[panel.metalColor ?? 'matte_black']
        : MATERIALS[panel.materialId].label
      const dimLabel = `${panel.dimensions.width} × ${panel.dimensions.height} × ${panel.dimensions.depth} سم`
      const hwKey = `${panel.role}|${dimLabel}|${matLabel}`
      const existing = hardwareMap.get(hwKey)
      if (existing) {
        existing.quantity += 1
      } else {
        hardwareMap.set(hwKey, {
          key: hwKey,
          name: ROLE_LABELS[panel.role],
          dimensionsLabel: dimLabel,
          materialLabel: matLabel,
          quantity: 1,
        })
      }
      continue
    }

    // 1ب. القاعدة الخشب المقوّسة (أرش 3.6 سم = قائمتين كل منهما طبقتين 1.8 سم)
    if (panel.role === 'wood_arch') {
      const lenCm = roundTo(Math.max(panel.dimensions.depth, panel.dimensions.height), 2)
      const widCm = roundTo(Math.min(panel.dimensions.depth, panel.dimensions.height), 2)
      const archNote = 'قص قوس أرش (تدبيل طبقتين 1.8 سم = 3.6 سم)'
      for (const side of ['يسار', 'يمين']) {
        for (let layer = 1; layer <= 2; layer += 1) {
          pieces.push({
            id: `${panel.id}_${side}_${layer}`,
            sourcePanelId: panel.id,
            name: `${panel.name} (${side})`,
            roleLabel: ROLE_LABELS.wood_arch,
            lengthCm: lenCm,
            widthCm: widCm,
            thicknessCm: 1.8,
            materialId: panel.materialId,
            edgeBanding: eb,
            edgeMetersPerPiece: layer === 1 ? calcEdgeMeters(panel.dimensions.depth, panel.dimensions.height, eb) : 0,
            edgeLabel: layer === 1 ? formatEdgeSummary(eb) : 'ضمن التدبيل',
            workshopNotes: archNote,
          })
        }
      }
      continue
    }

    // 2. الضلف المفصلية والجرار: المقاس الصافي بعد خصم الخلوص
    if (panel.role === 'hinged_door' || panel.role === 'sliding_door') {
      const clearance = panel.clearanceCm ?? 0.2
      const netW = Math.max(2, roundTo(panel.dimensions.width - clearance * 2, 2))
      const netH = Math.max(2, roundTo(panel.dimensions.height - clearance * 2, 2))
      const thicknessCm = roundTo(panel.dimensions.depth, 2)
      const lengthCm = Math.max(netW, netH)
      const widthCm = Math.min(netW, netH)

      const effHandle = getEffectivePanelHandle(panel)
      const baseNotes = buildPanelWorkshopNotes(panel)
      const handleNote = formatHandleWorkshopNote(effHandle)
      const combinedNotes = [baseNotes, handleNote].filter(Boolean).join(' | ')

      if (effHandle.type !== 'none') {
        const lenLabel =
          (effHandle.type === 'bar' || effHandle.type === 'edge') && effHandle.length
            ? `طول ${effHandle.length} سم`
            : 'مقاس قياسي'
        const hwKey = `handle|${effHandle.type}|${effHandle.color}|${lenLabel}`
        const existingHw = hardwareMap.get(hwKey)
        if (existingHw) {
          existingHw.quantity += 1
        } else {
          hardwareMap.set(hwKey, {
            key: hwKey,
            name: HANDLE_TYPE_LABELS[effHandle.type],
            dimensionsLabel: lenLabel,
            materialLabel: HANDLE_COLOR_LABELS[effHandle.color],
            quantity: 1,
          })
        }
      }

      pieces.push({
        id: `${panel.id}_door`,
        sourcePanelId: panel.id,
        name: panel.name,
        roleLabel: ROLE_LABELS[panel.role],
        lengthCm,
        widthCm,
        thicknessCm,
        materialId: panel.materialId,
        edgeBanding: eb,
        edgeMetersPerPiece: calcEdgeMeters(netW, netH, eb),
        edgeLabel: formatEdgeSummary(eb),
        workshopNotes: combinedNotes,
      })
      continue
    }

    // 3. الدرج: واجهة (بعد خصم الخلوص) + جنبين + ضهر + قاع (6 مم)
    if (panel.role === 'drawer') {
      const clearance = panel.clearanceCm ?? 0.2
      const effW = Math.max(3, roundTo(panel.dimensions.width - clearance * 2, 2))
      const effH = Math.max(3, roundTo(panel.dimensions.height - clearance * 2, 2))
      const frontThick = 1.8

      const effHandle = getEffectivePanelHandle(panel)
      const handleNote = formatHandleWorkshopNote(effHandle)

      if (effHandle.type !== 'none') {
        const lenLabel =
          (effHandle.type === 'bar' || effHandle.type === 'edge') && effHandle.length
            ? `طول ${effHandle.length} سم`
            : 'مقاس قياسي'
        const hwKey = `handle|${effHandle.type}|${effHandle.color}|${lenLabel}`
        const existingHw = hardwareMap.get(hwKey)
        if (existingHw) {
          existingHw.quantity += 1
        } else {
          hardwareMap.set(hwKey, {
            key: hwKey,
            name: HANDLE_TYPE_LABELS[effHandle.type],
            dimensionsLabel: lenLabel,
            materialLabel: HANDLE_COLOR_LABELS[effHandle.color],
            quantity: 1,
          })
        }
      }

      // واجهة الدرج
      pieces.push({
        id: `${panel.id}_front`,
        sourcePanelId: panel.id,
        name: `${panel.name} (واجهة)`,
        roleLabel: 'واجهة درج',
        lengthCm: Math.max(effW, effH),
        widthCm: Math.min(effW, effH),
        thicknessCm: frontThick,
        materialId: panel.materialId,
        edgeBanding: eb,
        edgeMetersPerPiece: calcEdgeMeters(effW, effH, eb),
        edgeLabel: formatEdgeSummary(eb),
        workshopNotes: handleNote,
      })

      // أجزاء صندوق الدرج الداخلي (جنبين + ضهر 18 مم، وقاع 6 مم)
      const boxW = Math.max(4, roundTo(effW - 2.6, 2))
      const boxH = Math.max(4, roundTo(effH - 2.8, 2))
      const boxD = Math.max(6, roundTo(panel.dimensions.depth - frontThick, 2))
      const boxWall = 1.8
      const sideEb: EdgeBanding = { top: true, bottom: false, right: false, left: false }

      for (let idx = 1; idx <= 2; idx++) {
        pieces.push({
          id: `${panel.id}_side_${idx}`,
          sourcePanelId: panel.id,
          name: `${panel.name} (جنب صندوق)`,
          roleLabel: 'جنب صندوق درج',
          lengthCm: Math.max(boxD, boxH),
          widthCm: Math.min(boxD, boxH),
          thicknessCm: boxWall,
          materialId: 'white',
          edgeBanding: sideEb,
          edgeMetersPerPiece: calcEdgeMeters(boxD, boxH, sideEb),
          edgeLabel: formatEdgeSummary(sideEb),
          workshopNotes: '',
        })
      }

      const backW = Math.max(4, roundTo(boxW - boxWall * 2, 2))
      pieces.push({
        id: `${panel.id}_back`,
        sourcePanelId: panel.id,
        name: `${panel.name} (ضهر صندوق)`,
        roleLabel: 'ضهر صندوق درج',
        lengthCm: Math.max(backW, boxH),
        widthCm: Math.min(backW, boxH),
        thicknessCm: boxWall,
        materialId: 'white',
        edgeBanding: sideEb,
        edgeMetersPerPiece: calcEdgeMeters(backW, boxH, sideEb),
        edgeLabel: formatEdgeSummary(sideEb),
        workshopNotes: '',
      })

      const bottomEb: EdgeBanding = { top: false, bottom: false, right: false, left: false }
      pieces.push({
        id: `${panel.id}_bottom`,
        sourcePanelId: panel.id,
        name: `${panel.name} (قاع صندوق)`,
        roleLabel: 'قاع درج (6 مم)',
        lengthCm: Math.max(backW, boxD),
        widthCm: Math.min(backW, boxD),
        thicknessCm: 0.6,
        materialId: 'white',
        edgeBanding: bottomEb,
        edgeMetersPerPiece: 0,
        edgeLabel: 'بدون شريط',
        workshopNotes: '',
      })
      continue
    }

    // 4. السوكلة / الوزرة الخشب (الظاهرة والغاطسة): 4 عوارض كونتر 18 مم
    if (panel.role === 'plinth_base' || panel.role === 'plinth_recessed') {
      const wall = 1.8
      const h = roundTo(panel.dimensions.height, 2)
      const w = roundTo(panel.dimensions.width, 2)
      const sideLen = Math.max(4, roundTo(panel.dimensions.depth - wall * 2, 2))

      // أمامي وخلفي
      for (const label of ['أمامي', 'خلفي']) {
        pieces.push({
          id: `${panel.id}_${label}`,
          sourcePanelId: panel.id,
          name: `${panel.name} (${label})`,
          roleLabel: 'وزرة كونتر',
          lengthCm: Math.max(w, h),
          widthCm: Math.min(w, h),
          thicknessCm: wall,
          materialId: panel.materialId,
          edgeBanding: eb,
          edgeMetersPerPiece: calcEdgeMeters(w, h, eb),
          edgeLabel: formatEdgeSummary(eb),
          workshopNotes: '',
        })
      }

      // جانبان
      for (const label of ['يمين', 'يسار']) {
        pieces.push({
          id: `${panel.id}_${label}`,
          sourcePanelId: panel.id,
          name: `${panel.name} (${label})`,
          roleLabel: 'وزرة كونتر',
          lengthCm: Math.max(sideLen, h),
          widthCm: Math.min(sideLen, h),
          thicknessCm: wall,
          materialId: panel.materialId,
          edgeBanding: eb,
          edgeMetersPerPiece: calcEdgeMeters(sideLen, h, eb),
          edgeLabel: formatEdgeSummary(eb),
          workshopNotes: '',
        })
      }
      continue
    }

    // 5. الألواح الأساسية (قرصة، جنب، رف، قاطع، ضهر، مخصص)
    const { thicknessCm, primaryDimCm, secondaryDimCm } = getBoardCutAxes(panel)
    const lengthCm = roundTo(Math.max(primaryDimCm, secondaryDimCm), 2)
    const widthCm = roundTo(Math.min(primaryDimCm, secondaryDimCm), 2)

    pieces.push({
      id: panel.id,
      sourcePanelId: panel.id,
      name: panel.name,
      roleLabel: ROLE_LABELS[panel.role],
      lengthCm,
      widthCm,
      thicknessCm: roundTo(thicknessCm, 2),
      materialId: panel.materialId,
      edgeBanding: eb,
      edgeMetersPerPiece: calcEdgeMeters(primaryDimCm, secondaryDimCm, eb),
      edgeLabel: formatEdgeSummary(eb),
      workshopNotes: buildPanelWorkshopNotes(panel),
    })
  }

  // تجميع القطع المتطابقة في جدول منظم
  const rowMap = new Map<string, GroupedCutRow>()
  const edgeByMat = new Map<MaterialId, number>()

  for (const piece of pieces) {
    const key = [
      piece.lengthCm.toFixed(2),
      piece.widthCm.toFixed(2),
      piece.thicknessCm.toFixed(2),
      piece.materialId,
      edgeSignature(piece.edgeBanding),
      piece.workshopNotes,
    ].join('|')

    const existing = rowMap.get(key)
    if (existing) {
      existing.quantity += 1
      if (!existing.names.includes(piece.name)) {
        existing.names.push(piece.name)
      }
      existing.totalEdgeMeters = roundTo(existing.totalEdgeMeters + piece.edgeMetersPerPiece, 2)
    } else {
      rowMap.set(key, {
        key,
        names: [piece.name],
        roleLabel: piece.roleLabel,
        lengthCm: piece.lengthCm,
        widthCm: piece.widthCm,
        thicknessCm: piece.thicknessCm,
        thicknessMm: Math.round(piece.thicknessCm * 10),
        materialId: piece.materialId,
        materialLabel: MATERIALS[piece.materialId].label,
        quantity: 1,
        edgeBanding: piece.edgeBanding,
        edgeLabel: piece.edgeLabel,
        totalEdgeMeters: roundTo(piece.edgeMetersPerPiece, 2),
        workshopNotes: piece.workshopNotes,
      })
    }

    edgeByMat.set(
      piece.materialId,
      roundTo((edgeByMat.get(piece.materialId) ?? 0) + piece.edgeMetersPerPiece, 2)
    )
  }

  const rows = Array.from(rowMap.values()).sort((a, b) => {
    if (b.thicknessMm !== a.thicknessMm) return b.thicknessMm - a.thicknessMm
    if (a.materialLabel !== b.materialLabel) {
      return a.materialLabel.localeCompare(b.materialLabel, 'ar')
    }
    return b.lengthCm * b.widthCm - a.lengthCm * a.widthCm
  })

  const edgeTotalsByMaterial: EdgeBandingMaterialTotal[] = Array.from(edgeByMat.entries())
    .filter(([, meters]) => meters > 0)
    .map(([materialId, meters]) => ({
      materialId,
      materialLabel: MATERIALS[materialId].label,
      meters: roundTo(meters, 2),
    }))

  const totalEdgeMeters = roundTo(
    edgeTotalsByMaterial.reduce((sum, item) => sum + item.meters, 0),
    2
  )

  return {
    pieces,
    rows,
    edgeTotalsByMaterial,
    totalEdgeMeters,
    totalCutPieces: pieces.length,
    hardware: Array.from(hardwareMap.values()),
  }
}
