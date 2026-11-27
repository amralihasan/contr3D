import * as THREE from 'three'
import { GRID_STEP_CM, SNAP_THRESHOLD_CM } from '../constants/presets'
import type {
  FurniturePanel,
  GuideLine,
  PanelDimensions,
  SnapFeedback,
  Vec3,
} from '../types/furniture'

export interface WorldBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  cx: number
  cy: number
  cz: number
  hx: number
  hy: number
  hz: number
}

const _euler = new THREE.Euler(0, 0, 0, 'XYZ')
const _matrix = new THREE.Matrix4()

/**
 * يحسب أنصاف الأبعاد العالمية (AABB Half-Extents) للوح بعد تطبيق الدوران
 */
export function getWorldHalfExtents(dimensions: PanelDimensions, rotation: Vec3): Vec3 {
  _euler.set(rotation[0], rotation[1], rotation[2], 'XYZ')
  _matrix.makeRotationFromEuler(_euler)
  const e = _matrix.elements
  const { width: w, height: h, depth: d } = dimensions

  const hx = (Math.abs(e[0]) * w + Math.abs(e[4]) * h + Math.abs(e[8]) * d) / 2
  const hy = (Math.abs(e[1]) * w + Math.abs(e[5]) * h + Math.abs(e[9]) * d) / 2
  const hz = (Math.abs(e[2]) * w + Math.abs(e[6]) * h + Math.abs(e[10]) * d) / 2

  return [roundTo(hx, 3), roundTo(hy, 3), roundTo(hz, 3)]
}

export function getPanelWorldBox(panel: FurniturePanel): WorldBox {
  const [hx, hy, hz] = getWorldHalfExtents(panel.dimensions, panel.rotation)
  const [cx, cy, cz] = panel.position
  return {
    minX: cx - hx,
    maxX: cx + hx,
    minY: cy - hy,
    maxY: cy + hy,
    minZ: cz - hz,
    maxZ: cz + hz,
    cx,
    cy,
    cz,
    hx,
    hy,
    hz,
  }
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function snapToGridEdge(center: number, halfExtent: number, step: number): number {
  const minEdge = center - halfExtent
  const snappedMin = Math.round(minEdge / step) * step
  return roundTo(snappedMin + halfExtent, 3)
}

function rangesNear(aMin: number, aMax: number, bMin: number, bMax: number, margin: number): boolean {
  return aMax >= bMin - margin && aMin <= bMax + margin
}

export interface SnapResult {
  position: Vec3
  feedback: SnapFeedback
}

/**
 * يحسب الموضع الجديد للوح مع المغناطيس الذكي:
 * 1) الالتصاق بسطح الأرض (Y = 0) ومنع الغوص تحت الأرض
 * 2) الالتصاق بالخطوط الإرشادية (العلامات) من الحواف أو المنتصف
 * 3) الالتصاق بأسطح وحواف الألواح القريبة لمنع التداخل أو الفراغات العشوائية
 * 4) التحرك بخطوات دقيقة (0.5 سم) للمحاور التي لم تلتصق بسطح أو علام
 */
export function computeSnappedPosition(
  movingPanel: FurniturePanel,
  proposedPosition: Vec3,
  otherPanels: FurniturePanel[],
  snappingEnabled: boolean,
  guides: GuideLine[] = []
): SnapResult {
  const [hx, hy, hz] = getWorldHalfExtents(movingPanel.dimensions, movingPanel.rotation)
  let x = proposedPosition[0]
  let y = proposedPosition[1]
  let z = proposedPosition[2]

  // منع نزول أي لوح أسفل مستوى الأرضية Y = 0
  if (y < hy) {
    y = hy
  }

  if (!snappingEnabled) {
    return {
      position: [roundTo(x, 2), roundTo(y, 2), roundTo(z, 2)],
      feedback: { x: false, y: false, z: false, floor: Math.abs(y - hy) < 0.01, guide: false },
    }
  }

  const feedback: SnapFeedback = { x: false, y: false, z: false, floor: false, guide: false }
  const proximityMargin = 15 // سم لاعتبار الألواح قريبة من بعضها في المحاور المتعامدة
  const otherBoxes = otherPanels.map(getPanelWorldBox)

  // --- المحور Y (الأرضية + العلامات + الألواح الأخرى) ---
  let bestYDist = SNAP_THRESHOLD_CM
  let bestY = y

  const floorDist = Math.abs(y - hy)
  if (floorDist <= bestYDist) {
    bestYDist = floorDist
    bestY = hy
    feedback.y = true
    feedback.floor = true
  }

  // علامات المحور Y
  for (const g of guides) {
    if (g.offsetAxis !== 'y') continue
    const candidates = [
      g.worldCoord + hy, // أسفل اللوح على العلام
      g.worldCoord - hy, // أعلى اللوح على العلام
      g.worldCoord, // منتصف اللوح على العلام
    ]
    for (const candidate of candidates) {
      if (candidate < hy - 0.001) continue
      const dist = Math.abs(y - candidate)
      if (dist <= bestYDist) {
        bestYDist = dist
        bestY = candidate
        feedback.y = true
        feedback.floor = Math.abs(candidate - hy) < 0.01
        feedback.guide = true
      }
    }
  }

  for (const ob of otherBoxes) {
    const nearXZ =
      rangesNear(x - hx, x + hx, ob.minX, ob.maxX, proximityMargin) &&
      rangesNear(z - hz, z + hz, ob.minZ, ob.maxZ, proximityMargin)
    if (!nearXZ) continue

    const candidates = [
      ob.maxY + hy, // أسفل اللوح المتحرك على سطح اللوح الآخر
      ob.minY - hy, // أعلى اللوح المتحرك أسفل اللوح الآخر
      ob.minY + hy, // محاذاة القاع
      ob.maxY - hy, // محاذاة السطح العلوي
    ]

    for (const candidate of candidates) {
      if (candidate < hy - 0.001) continue
      const dist = Math.abs(y - candidate)
      if (dist < bestYDist) {
        bestYDist = dist
        bestY = candidate
        feedback.y = true
        feedback.floor = Math.abs(candidate - hy) < 0.01
        feedback.guide = false
      }
    }
  }

  y = feedback.y ? roundTo(bestY, 3) : snapToGridEdge(y, hy, GRID_STEP_CM)
  if (y < hy) y = hy

  // --- المحور X (العلامات + الألواح الأخرى) ---
  let bestXDist = SNAP_THRESHOLD_CM
  let bestX = x
  let snappedXToGuide = false

  for (const g of guides) {
    if (g.offsetAxis !== 'x') continue
    const candidates = [g.worldCoord + hx, g.worldCoord - hx, g.worldCoord]
    for (const candidate of candidates) {
      const dist = Math.abs(x - candidate)
      if (dist <= bestXDist) {
        bestXDist = dist
        bestX = candidate
        feedback.x = true
        snappedXToGuide = true
      }
    }
  }

  for (const ob of otherBoxes) {
    const nearYZ =
      rangesNear(y - hy, y + hy, ob.minY, ob.maxY, proximityMargin) &&
      rangesNear(z - hz, z + hz, ob.minZ, ob.maxZ, proximityMargin)
    if (!nearYZ) continue

    const candidates = [
      ob.maxX + hx,
      ob.minX - hx,
      ob.minX + hx,
      ob.maxX - hx,
      ob.cx,
    ]

    for (const candidate of candidates) {
      const dist = Math.abs(x - candidate)
      if (dist < bestXDist) {
        bestXDist = dist
        bestX = candidate
        feedback.x = true
        snappedXToGuide = false
      }
    }
  }

  if (snappedXToGuide) feedback.guide = true
  x = feedback.x ? roundTo(bestX, 3) : snapToGridEdge(x, hx, GRID_STEP_CM)

  // --- المحور Z (العلامات + الألواح الأخرى) ---
  let bestZDist = SNAP_THRESHOLD_CM
  let bestZ = z
  let snappedZToGuide = false

  for (const g of guides) {
    if (g.offsetAxis !== 'z') continue
    const candidates = [g.worldCoord + hz, g.worldCoord - hz, g.worldCoord]
    for (const candidate of candidates) {
      const dist = Math.abs(z - candidate)
      if (dist <= bestZDist) {
        bestZDist = dist
        bestZ = candidate
        feedback.z = true
        snappedZToGuide = true
      }
    }
  }

  for (const ob of otherBoxes) {
    const nearXY =
      rangesNear(x - hx, x + hx, ob.minX, ob.maxX, proximityMargin) &&
      rangesNear(y - hy, y + hy, ob.minY, ob.maxY, proximityMargin)
    if (!nearXY) continue

    const candidates = [
      ob.maxZ + hz,
      ob.minZ - hz,
      ob.minZ + hz,
      ob.maxZ - hz,
      ob.cz,
    ]

    for (const candidate of candidates) {
      const dist = Math.abs(z - candidate)
      if (dist < bestZDist) {
        bestZDist = dist
        bestZ = candidate
        feedback.z = true
        snappedZToGuide = false
      }
    }
  }

  if (snappedZToGuide) feedback.guide = true
  z = feedback.z ? roundTo(bestZ, 3) : snapToGridEdge(z, hz, GRID_STEP_CM)

  return {
    position: [roundTo(x, 2), roundTo(y, 2), roundTo(z, 2)],
    feedback,
  }
}

/**
 * يضمن بقاء اللوح فوق الأرضية (Y >= 0) بعد تغيير المقاسات أو الدوران
 */
export function clampPanelAboveFloor(panel: FurniturePanel): Vec3 {
  const [, hy] = getWorldHalfExtents(panel.dimensions, panel.rotation)
  const [x, y, z] = panel.position
  if (y < hy) {
    return [x, roundTo(hy, 2), z]
  }
  return panel.position
}
