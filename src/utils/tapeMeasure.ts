import * as THREE from 'three'
import type { Axis, FurniturePanel, GuideLine, Vec3 } from '../types/furniture'
import { getPanelWorldBox, roundTo } from './snapping'

export interface ReferenceEdge {
  panelId: string
  panelName: string
  edgeLabel: string
  lineAxis: Axis
  offsetAxis: Axis
  normalAxis: Axis
  referenceEdgeCoord: number
  defaultDirection: 1 | -1
  surfaceCoord: number
  surfaceSign: 1 | -1
  edgeStart: Vec3
  edgeEnd: Vec3
  spanMin: number
  spanMax: number
}

export interface SnappedMeasurePoint {
  point: Vec3
  snapKind: 'corner' | 'midpoint' | 'surface'
  label: string
}

function makeVec3OnAxes(
  lineAxis: Axis,
  lineVal: number,
  offsetAxis: Axis,
  offsetVal: number,
  normalAxis: Axis,
  normalVal: number
): Vec3 {
  const out: Vec3 = [0, 0, 0]
  const idx = { x: 0, y: 1, z: 2 } as const
  out[idx[lineAxis]] = roundTo(lineVal, 2)
  out[idx[offsetAxis]] = roundTo(offsetVal, 2)
  out[idx[normalAxis]] = roundTo(normalVal, 2)
  return out
}

/**
 * يحدد أقرب حافة على الوجه المضغوط من اللوح لتكون مرجعاً لعمل علام (خط إرشادي)
 */
export function pickReferenceEdgeFromHit(
  panel: FurniturePanel,
  hitPoint: THREE.Vector3,
  worldNormal: THREE.Vector3
): ReferenceEdge {
  const box = getPanelWorldBox(panel)
  const ax = Math.abs(worldNormal.x)
  const ay = Math.abs(worldNormal.y)
  const az = Math.abs(worldNormal.z)

  interface EdgeCandidate {
    edgeLabel: string
    lineAxis: Axis
    offsetAxis: Axis
    referenceEdgeCoord: number
    defaultDirection: 1 | -1
    spanMin: number
    spanMax: number
    dist: number
  }

  let normalAxis: Axis = 'z'
  let surfaceCoord = box.maxZ
  let surfaceSign: 1 | -1 = 1
  let candidates: EdgeCandidate[] = []

  if (ax >= ay && ax >= az) {
    normalAxis = 'x'
    surfaceSign = worldNormal.x >= 0 ? 1 : -1
    surfaceCoord = surfaceSign > 0 ? box.maxX : box.minX
    candidates = [
      {
        edgeLabel: 'الحافة السفلية',
        lineAxis: 'z',
        offsetAxis: 'y',
        referenceEdgeCoord: box.minY,
        defaultDirection: 1,
        spanMin: box.minZ,
        spanMax: box.maxZ,
        dist: Math.abs(hitPoint.y - box.minY),
      },
      {
        edgeLabel: 'الحافة العلوية',
        lineAxis: 'z',
        offsetAxis: 'y',
        referenceEdgeCoord: box.maxY,
        defaultDirection: -1,
        spanMin: box.minZ,
        spanMax: box.maxZ,
        dist: Math.abs(hitPoint.y - box.maxY),
      },
      {
        edgeLabel: 'الحافة الخلفية',
        lineAxis: 'y',
        offsetAxis: 'z',
        referenceEdgeCoord: box.minZ,
        defaultDirection: 1,
        spanMin: box.minY,
        spanMax: box.maxY,
        dist: Math.abs(hitPoint.z - box.minZ),
      },
      {
        edgeLabel: 'الحافة الأمامية',
        lineAxis: 'y',
        offsetAxis: 'z',
        referenceEdgeCoord: box.maxZ,
        defaultDirection: -1,
        spanMin: box.minY,
        spanMax: box.maxY,
        dist: Math.abs(hitPoint.z - box.maxZ),
      },
    ]
  } else if (ay >= ax && ay >= az) {
    normalAxis = 'y'
    surfaceSign = worldNormal.y >= 0 ? 1 : -1
    surfaceCoord = surfaceSign > 0 ? box.maxY : box.minY
    candidates = [
      {
        edgeLabel: 'الحافة اليسرى',
        lineAxis: 'z',
        offsetAxis: 'x',
        referenceEdgeCoord: box.minX,
        defaultDirection: 1,
        spanMin: box.minZ,
        spanMax: box.maxZ,
        dist: Math.abs(hitPoint.x - box.minX),
      },
      {
        edgeLabel: 'الحافة اليمنى',
        lineAxis: 'z',
        offsetAxis: 'x',
        referenceEdgeCoord: box.maxX,
        defaultDirection: -1,
        spanMin: box.minZ,
        spanMax: box.maxZ,
        dist: Math.abs(hitPoint.x - box.maxX),
      },
      {
        edgeLabel: 'الحافة الخلفية',
        lineAxis: 'x',
        offsetAxis: 'z',
        referenceEdgeCoord: box.minZ,
        defaultDirection: 1,
        spanMin: box.minX,
        spanMax: box.maxX,
        dist: Math.abs(hitPoint.z - box.minZ),
      },
      {
        edgeLabel: 'الحافة الأمامية',
        lineAxis: 'x',
        offsetAxis: 'z',
        referenceEdgeCoord: box.maxZ,
        defaultDirection: -1,
        spanMin: box.minX,
        spanMax: box.maxX,
        dist: Math.abs(hitPoint.z - box.maxZ),
      },
    ]
  } else {
    normalAxis = 'z'
    surfaceSign = worldNormal.z >= 0 ? 1 : -1
    surfaceCoord = surfaceSign > 0 ? box.maxZ : box.minZ
    candidates = [
      {
        edgeLabel: 'الحافة السفلية',
        lineAxis: 'x',
        offsetAxis: 'y',
        referenceEdgeCoord: box.minY,
        defaultDirection: 1,
        spanMin: box.minX,
        spanMax: box.maxX,
        dist: Math.abs(hitPoint.y - box.minY),
      },
      {
        edgeLabel: 'الحافة العلوية',
        lineAxis: 'x',
        offsetAxis: 'y',
        referenceEdgeCoord: box.maxY,
        defaultDirection: -1,
        spanMin: box.minX,
        spanMax: box.maxX,
        dist: Math.abs(hitPoint.y - box.maxY),
      },
      {
        edgeLabel: 'الحافة اليسرى',
        lineAxis: 'y',
        offsetAxis: 'x',
        referenceEdgeCoord: box.minX,
        defaultDirection: 1,
        spanMin: box.minY,
        spanMax: box.maxY,
        dist: Math.abs(hitPoint.x - box.minX),
      },
      {
        edgeLabel: 'الحافة اليمنى',
        lineAxis: 'y',
        offsetAxis: 'x',
        referenceEdgeCoord: box.maxX,
        defaultDirection: -1,
        spanMin: box.minY,
        spanMax: box.maxY,
        dist: Math.abs(hitPoint.x - box.maxX),
      },
    ]
  }

  candidates.sort((a, b) => a.dist - b.dist)
  const best = candidates[0]
  const liftedSurface = surfaceCoord + surfaceSign * 0.15

  return {
    panelId: panel.id,
    panelName: panel.name,
    edgeLabel: best.edgeLabel,
    lineAxis: best.lineAxis,
    offsetAxis: best.offsetAxis,
    normalAxis,
    referenceEdgeCoord: roundTo(best.referenceEdgeCoord, 2),
    defaultDirection: best.defaultDirection,
    surfaceCoord: roundTo(surfaceCoord, 2),
    surfaceSign,
    edgeStart: makeVec3OnAxes(
      best.lineAxis,
      best.spanMin,
      best.offsetAxis,
      best.referenceEdgeCoord,
      normalAxis,
      liftedSurface
    ),
    edgeEnd: makeVec3OnAxes(
      best.lineAxis,
      best.spanMax,
      best.offsetAxis,
      best.referenceEdgeCoord,
      normalAxis,
      liftedSurface
    ),
    spanMin: roundTo(best.spanMin, 2),
    spanMax: roundTo(best.spanMax, 2),
  }
}

/**
 * يبني كائن الخط الإرشادي الكامل انطلاقاً من الحافة المرجعية والمسافة بالسنتيمتر
 */
export function buildGuideLineGeometry(
  params: {
    id: string
    panelId: string
    panelName: string
    edgeLabel: string
    lineAxis: Axis
    offsetAxis: Axis
    normalAxis: Axis
    surfaceCoord: number
    surfaceSign: 1 | -1
    referenceEdgeCoord: number
    direction: 1 | -1
    distanceCm: number
    spanMin: number
    spanMax: number
  }
): GuideLine {
  const safeDist = Math.max(0, roundTo(params.distanceCm, 2))
  const worldCoord = roundTo(params.referenceEdgeCoord + params.direction * safeDist, 2)
  const extend = 4
  const liftedSurface = params.surfaceCoord + params.surfaceSign * 0.15
  const spanMid = (params.spanMin + params.spanMax) / 2

  const spanStart = makeVec3OnAxes(
    params.lineAxis,
    params.spanMin - extend,
    params.offsetAxis,
    worldCoord,
    params.normalAxis,
    liftedSurface
  )
  const spanEnd = makeVec3OnAxes(
    params.lineAxis,
    params.spanMax + extend,
    params.offsetAxis,
    worldCoord,
    params.normalAxis,
    liftedSurface
  )
  const labelPosition = makeVec3OnAxes(
    params.lineAxis,
    spanMid,
    params.offsetAxis,
    worldCoord,
    params.normalAxis,
    liftedSurface + params.surfaceSign * 0.4
  )

  return {
    id: params.id,
    panelId: params.panelId,
    panelName: params.panelName,
    edgeLabel: params.edgeLabel,
    lineAxis: params.lineAxis,
    offsetAxis: params.offsetAxis,
    normalAxis: params.normalAxis,
    surfaceCoord: params.surfaceCoord,
    surfaceSign: params.surfaceSign,
    referenceEdgeCoord: params.referenceEdgeCoord,
    direction: params.direction,
    distanceCm: safeDist,
    worldCoord,
    spanMin: params.spanMin,
    spanMax: params.spanMax,
    spanStart,
    spanEnd,
    labelPosition,
  }
}

/**
 * يلتقط أقرب زاوية أو منتصف حافة أو نقطة سطح على اللوح لقياس المسافة بدقة
 */
export function snapPointToPanelFeatures(
  panel: FurniturePanel,
  rawHit: THREE.Vector3
): SnappedMeasurePoint {
  const b = getPanelWorldBox(panel)
  const corners: Vec3[] = [
    [b.minX, b.minY, b.minZ],
    [b.maxX, b.minY, b.minZ],
    [b.minX, b.maxY, b.minZ],
    [b.maxX, b.maxY, b.minZ],
    [b.minX, b.minY, b.maxZ],
    [b.maxX, b.minY, b.maxZ],
    [b.minX, b.maxY, b.maxZ],
    [b.maxX, b.maxY, b.maxZ],
  ]

  const midpoints: Vec3[] = [
    [b.cx, b.minY, b.minZ],
    [b.cx, b.maxY, b.minZ],
    [b.cx, b.minY, b.maxZ],
    [b.cx, b.maxY, b.maxZ],
    [b.minX, b.cy, b.minZ],
    [b.maxX, b.cy, b.minZ],
    [b.minX, b.cy, b.maxZ],
    [b.maxX, b.cy, b.maxZ],
    [b.minX, b.minY, b.cz],
    [b.maxX, b.minY, b.cz],
    [b.minX, b.maxY, b.cz],
    [b.maxX, b.maxY, b.cz],
  ]

  const snapRadius = 4.5
  let bestCorner: Vec3 | null = null
  let bestCornerDist = snapRadius

  for (const c of corners) {
    const d = Math.hypot(rawHit.x - c[0], rawHit.y - c[1], rawHit.z - c[2])
    if (d < bestCornerDist) {
      bestCornerDist = d
      bestCorner = c
    }
  }
  if (bestCorner) {
    return {
      point: [roundTo(bestCorner[0], 2), roundTo(bestCorner[1], 2), roundTo(bestCorner[2], 2)],
      snapKind: 'corner',
      label: 'زاوية',
    }
  }

  let bestMid: Vec3 | null = null
  let bestMidDist = snapRadius
  for (const m of midpoints) {
    const d = Math.hypot(rawHit.x - m[0], rawHit.y - m[1], rawHit.z - m[2])
    if (d < bestMidDist) {
      bestMidDist = d
      bestMid = m
    }
  }
  if (bestMid) {
    return {
      point: [roundTo(bestMid[0], 2), roundTo(bestMid[1], 2), roundTo(bestMid[2], 2)],
      snapKind: 'midpoint',
      label: 'منتصف حافة',
    }
  }

  return {
    point: [
      roundTo(Math.round(rawHit.x * 2) / 2, 2),
      roundTo(Math.round(rawHit.y * 2) / 2, 2),
      roundTo(Math.round(rawHit.z * 2) / 2, 2),
    ],
    snapKind: 'surface',
    label: 'سطح',
  }
}

export function formatDirectionLabel(offsetAxis: Axis, direction: 1 | -1): string {
  if (offsetAxis === 'y') return direction === 1 ? 'للأعلى (+Y)' : 'للأسفل (-Y)'
  if (offsetAxis === 'x') return direction === 1 ? 'لليمين (+X)' : 'لليسار (-X)'
  return direction === 1 ? 'للأمام (+Z)' : 'للخلف (-Z)'
}

export interface AxisLockedMeasureResult {
  end: Vec3
  unitDir: Vec3
  lockedAxis: Axis | null
  distanceCm: number
}

export function getAxisColor(axis: Axis | null): string {
  if (axis === 'x') return '#f43f5e'
  if (axis === 'y') return '#22c55e'
  if (axis === 'z') return '#38bdf8'
  return '#fbbf24'
}

export function getAxisLabelAr(axis: Axis | null): string {
  if (axis === 'x') return 'محور X (عرض)'
  if (axis === 'y') return 'محور Y (ارتفاع)'
  if (axis === 'z') return 'محور Z (عمق)'
  return 'قياس حر'
}

/**
 * يحسب نقطة النهاية مع قفل تلقائي على المحاور (X / Y / Z)
 * يحافظ على الزوايا ومنتصفات الحواف بدقة، ويقفل تلقائياً على المحور القريب في السحب الحر
 */
export function computeAxisLockedMeasureTarget(
  start: Vec3,
  rawTarget: Vec3,
  isExactFeatureSnap: boolean
): AxisLockedMeasureResult {
  const dx = rawTarget[0] - start[0]
  const dy = rawTarget[1] - start[1]
  const dz = rawTarget[2] - start[2]
  const totalDist = Math.hypot(dx, dy, dz)

  if (totalDist < 0.05) {
    return {
      end: [...start],
      unitDir: [1, 0, 0],
      lockedAxis: null,
      distanceCm: 0,
    }
  }

  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  const az = Math.abs(dz)

  let dominantAxis: Axis = 'x'
  let dominantAbs = ax
  let minorMax = Math.max(ay, az)
  if (ay > dominantAbs) {
    dominantAxis = 'y'
    dominantAbs = ay
    minorMax = Math.max(ax, az)
  }
  if (az > dominantAbs) {
    dominantAxis = 'z'
    dominantAbs = az
    minorMax = Math.max(ax, ay)
  }

  if (isExactFeatureSnap) {
    const alignedToAxis = minorMax <= 0.15
    return {
      end: [
        roundTo(rawTarget[0], 2),
        roundTo(rawTarget[1], 2),
        roundTo(rawTarget[2], 2),
      ],
      unitDir: [dx / totalDist, dy / totalDist, dz / totalDist],
      lockedAxis: alignedToAxis ? dominantAxis : null,
      distanceCm: roundTo(totalDist, 2),
    }
  }

  const ratio = dominantAbs / totalDist
  const shouldLock = ratio >= 0.88 && minorMax <= Math.max(1.5, dominantAbs * 0.25)

  if (shouldLock) {
    const sign =
      dominantAxis === 'x'
        ? dx >= 0
          ? 1
          : -1
        : dominantAxis === 'y'
          ? dy >= 0
            ? 1
            : -1
          : dz >= 0
            ? 1
            : -1
    const snappedLen = roundTo(Math.round(dominantAbs * 10) / 10, 2)
    return {
      end: [
        dominantAxis === 'x' ? roundTo(start[0] + sign * snappedLen, 2) : start[0],
        dominantAxis === 'y' ? roundTo(start[1] + sign * snappedLen, 2) : start[1],
        dominantAxis === 'z' ? roundTo(start[2] + sign * snappedLen, 2) : start[2],
      ],
      unitDir: [
        dominantAxis === 'x' ? sign : 0,
        dominantAxis === 'y' ? sign : 0,
        dominantAxis === 'z' ? sign : 0,
      ],
      lockedAxis: dominantAxis,
      distanceCm: snappedLen,
    }
  }

  return {
    end: [
      roundTo(rawTarget[0], 2),
      roundTo(rawTarget[1], 2),
      roundTo(rawTarget[2], 2),
    ],
    unitDir: [dx / totalDist, dy / totalDist, dz / totalDist],
    lockedAxis: null,
    distanceCm: roundTo(totalDist, 2),
  }
}

export function buildPointGuideGeometry(params: {
  id: string
  start: Vec3
  end: Vec3
  unitDir?: Vec3
  lockedAxis?: Axis | null
}): GuideLine {
  const dx = params.end[0] - params.start[0]
  const dy = params.end[1] - params.start[1]
  const dz = params.end[2] - params.start[2]
  const dist = roundTo(Math.hypot(dx, dy, dz), 2)

  let unitDir: Vec3 = params.unitDir ?? [1, 0, 0]
  if (!params.unitDir && dist > 0.001) {
    unitDir = [dx / dist, dy / dist, dz / dist]
  }

  let lockedAxis = params.lockedAxis ?? null
  if (lockedAxis === null && dist > 0.01) {
    const ax = Math.abs(dx)
    const ay = Math.abs(dy)
    const az = Math.abs(dz)
    if (ax > ay && ax > az && Math.max(ay, az) <= 0.15) lockedAxis = 'x'
    else if (ay > ax && ay > az && Math.max(ax, az) <= 0.15) lockedAxis = 'y'
    else if (az > ax && az > ay && Math.max(ax, ay) <= 0.15) lockedAxis = 'z'
  }

  const offsetAxis: Axis = lockedAxis ?? 'y'
  const axisIdx = offsetAxis === 'x' ? 0 : offsetAxis === 'y' ? 1 : 2
  const direction: 1 | -1 = unitDir[axisIdx] < 0 ? -1 : 1
  const lineAxis: Axis = offsetAxis === 'x' ? 'z' : 'x'
  const normalAxis: Axis = offsetAxis === 'z' ? 'y' : 'z'

  const spanStart: Vec3 = [
    roundTo(params.start[0], 2),
    roundTo(params.start[1], 2),
    roundTo(params.start[2], 2),
  ]
  const spanEnd: Vec3 = [
    roundTo(params.end[0], 2),
    roundTo(params.end[1], 2),
    roundTo(params.end[2], 2),
  ]
  const labelPosition: Vec3 = [
    roundTo((spanStart[0] + spanEnd[0]) / 2, 2),
    roundTo((spanStart[1] + spanEnd[1]) / 2, 2),
    roundTo((spanStart[2] + spanEnd[2]) / 2, 2),
  ]

  return {
    id: params.id,
    kind: 'point',
    measureStart: spanStart,
    measureEnd: spanEnd,
    unitDir,
    lockedAxis,
    panelId: '',
    panelName: 'قياس حر',
    edgeLabel: getAxisLabelAr(lockedAxis),
    lineAxis,
    offsetAxis,
    normalAxis,
    surfaceCoord: 0,
    surfaceSign: 1,
    referenceEdgeCoord: spanStart[axisIdx],
    direction,
    distanceCm: dist,
    worldCoord: spanEnd[axisIdx],
    spanMin: Math.min(spanStart[axisIdx], spanEnd[axisIdx]),
    spanMax: Math.max(spanStart[axisIdx], spanEnd[axisIdx]),
    spanStart,
    spanEnd,
    labelPosition,
  }
}

export function updatePointGuideDistance(guide: GuideLine, nextDistanceCm: number): GuideLine {
  const safe = Math.max(0, roundTo(nextDistanceCm, 2))
  const start = guide.measureStart ?? guide.spanStart
  const rawEnd = guide.measureEnd ?? guide.spanEnd
  let dir = guide.unitDir

  if (!dir) {
    const dx = rawEnd[0] - start[0]
    const dy = rawEnd[1] - start[1]
    const dz = rawEnd[2] - start[2]
    const len = Math.hypot(dx, dy, dz)
    dir = len > 0.001 ? [dx / len, dy / len, dz / len] : [1, 0, 0]
  }

  const nextEnd: Vec3 = [
    roundTo(start[0] + dir[0] * safe, 2),
    roundTo(start[1] + dir[1] * safe, 2),
    roundTo(start[2] + dir[2] * safe, 2),
  ]

  return buildPointGuideGeometry({
    id: guide.id,
    start,
    end: nextEnd,
    unitDir: dir,
    lockedAxis: guide.lockedAxis ?? null,
  })
}
